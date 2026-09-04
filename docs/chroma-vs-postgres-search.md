# Vì sao Chroma (vector search) không dùng làm nguồn tìm kiếm chính, và Postgres thì có

**Ngày:** 2026-09-03
**Phạm vi:** `lib/retrieval/warehouse.ts` — Retriever thay thế `mock.ts`

## 1. Bối cảnh

Khi chuyển từ mock data sang data thật, có 2 nguồn dữ liệu:

- **Postgres** (`datawarehouse_*.sql`): dữ liệu có cấu trúc — `venues` (1657 dòng), `hotels` (62), `reviews` (32.486), `countries`/`states`, v.v.
- **Chroma** (`chromadb_backup.tar.gz`): 3.717 embedding (384 chiều) trong 1 collection tên `"vaults"` — mỗi embedding là 1 đoạn text bằng chứng (review, Google Maps overview, trang web) có gắn `lgbt_mention`/`lgbt_kind` và `venue_ids`/`hotel_ids` để nối ngược về Postgres.

Kế hoạch ban đầu: dùng Chroma làm **công cụ tìm kiếm chính** (semantic search theo câu hỏi người dùng), Postgres chỉ để lấy chi tiết record sau khi đã có id. Đây là thiết kế "chuẩn" cho RAG — nhưng khi test thật thì sai.

## 2. Vấn đề phát hiện: Chroma không mã hóa được vị trí địa lý

### Test tái hiện lỗi

Câu hỏi: *"Recommend a gay-friendly bar in Barcelona"*

Chuỗi truy vấn gửi vào Chroma (ghép từ output Stage 1): `"bar Barcelona Spain gay-friendly nightlife"`

Kết quả semantic search (top 40 embedding gần nhất, gộp theo entity):

| Distance | Entity | Vị trí thật |
|---|---|---|
| 0.91 | 419.Cocktails & Cine Bar | **Hồ Chí Minh, Việt Nam** |
| 0.97 | Royal Albion Hotel | Brighton, Anh |
| 1.06 | The Grand Brighton | Brighton, Anh |

→ Không có kết quả nào ở Barcelona hay Tây Ban Nha.

### Đào sâu hơn: tăng số lượng kết quả lên 400 (hơn 10% toàn bộ 3.717 embedding)

```
total raw rows: 400   distinct entities: 7
```

400 dòng gần nhất chỉ quy về **7 entity khác nhau**, và vẫn không có entity nào ở Tây Ban Nha/Catalonia — dù Postgres có tới 607 venue ở Tây Ban Nha (487 ở riêng Catalonia).

### Nguyên nhân gốc

1. **Mất cân bằng số lượng embedding trên mỗi entity.** Một địa điểm có 50+ review sẽ có 50+ embedding trong Chroma; một địa điểm khác chỉ có 1 bản ghi Google Maps overview thì chỉ có 1 embedding. Khi tìm "k láng giềng gần nhất", entity nào có nhiều review sẽ chiếm phần lớn top-K chỉ vì *số lượng* embedding, không phải vì *liên quan* hơn.
2. **Embedding mã hóa nội dung/chủ đề, không mã hóa địa lý.** Các từ khóa chung như "bar", "gay-friendly", "nightlife" xuất hiện trong hầu hết review ở mọi thành phố → vector của chúng gần nhau bất kể vị trí thật. Không có tín hiệu nào trong vector "kéo" kết quả về đúng Barcelona nếu bản thân đoạn text không nói rõ "Barcelona".
3. Đây không phải lỗi cấu hình hay lỗi code — là giới hạn bản chất của nearest-neighbor search trên embedding văn bản khi truy vấn có ràng buộc cứng (vị trí) mà nội dung text không nhấn mạnh ràng buộc đó.

### Nhưng template document rõ ràng có field "Address" — sao vẫn không tìm ra theo vị trí?

Đây là câu hỏi hợp lý: 1 trong các loại document (`source: "google_map_overview"`) có template đầy đủ address/lat-long/rating. Vậy tại sao query có tên thành phố vẫn không "bắt" được nó? 3 lý do, có kiểm chứng thực nghiệm:

**a) Loại document có Address chỉ chiếm 0.5% dữ liệu.** Soi trực tiếp `chroma.sqlite3` theo `type`/`source`:

| Loại document | Số lượng | Có Address? |
|---|---|---|
| `review` (từng review lẻ — chỉ có reviewer/rating/nội dung) | 3677 | Không |
| `google_map_overview` (đúng template có Address) | 19 | Có |
| `web` (trang crawl) | 21 | Có (dạng khác) |

98.9% document trong vault không hề chứa địa chỉ. Semantic search cân nhắc trên toàn bộ 3717 document, nên phần lớn "hàng xóm gần nhất" vốn dĩ không có thông tin vị trí để so khớp.

**b) Ngay cả khi query trùng gần như tuyệt đối với 1 Address thật, vẫn ra sai entity.** Test bằng chính địa chỉ thật của khách sạn ibis Brighton (`"88-92 Queens Rd Brighton BN1 3XE United Kingdom"`):

```
distance=0.7824  [Hotel: Royal Albion Hotel] ... Address: Royal Albion Hotel, 35 Old...
distance=0.8292  [Hotel: Royal Albion Hotel] review...
distance=0.8466  [Hotel: ibis Brighton City Centre] review...
distance=0.8622  [Hotel: The Grand Brighton] ... Address: ...
```

Model xếp **"Royal Albion Hotel"** (địa chỉ hoàn toàn khác, chỉ chung là Brighton) lên hạng 1 — không phải đúng khách sạn ibis được copy nguyên văn địa chỉ. Embedding không phải index tra cứu chính xác; nó chỉ nhận diện "văn bản này có dạng địa chỉ ở Brighton" (nhờ các từ như "Rd", "Brighton", mã bưu điện "BN1..."), rồi mọi khách sạn Brighton khác trôi lại gần nhau — không phân biệt được đây là địa chỉ cụ thể của ai.

**c) Trong truy vấn thật, người dùng không gõ địa chỉ.** Câu hỏi thật ("gay-friendly bar in Barcelona") chỉ có tên thành phố + vài từ chung chung, không có street/postcode — mà những từ chung đó ("bar", "nightlife", "gay-friendly") lại xuất hiện dày đặc trong review ở *mọi* thành phố, trong khi tên thành phố hầu như không được nhắc lại trong nội dung 1 review lẻ (vd 1 review chỉ nói "great staff, great location"). Nên vector câu hỏi không có gì để "kéo" về đúng review ở đúng thành phố — entity nào có *nhiều review nhất* (bất kể ở đâu) luôn thắng về mật độ lân cận.

→ Field Address tồn tại trong văn bản thô của 1 loại document hiếm, nhưng embedding không đối xử với nó như 1 trường có cấu trúc để lọc/tra cứu chính xác — nó chỉ là vài chục ký tự bị "hòa tan" vào 1 vector đại diện cho cả đoạn văn.

### Vá tạm không đủ

Ban đầu tôi thử thêm "cổng chặn": chỉ tin kết quả nếu tên quốc gia/thành phố xuất hiện trong câu hỏi (giống logic `mock.ts` cũ). Việc này lọc đúng — trả về rỗng thay vì sai — nhưng **rỗng cũng sai**, vì Postgres thật ra có 607 quán bar ở Tây Ban Nha. Vấn đề không phải là thiếu cổng chặn, mà là *nguồn ứng viên* (candidate generation) từ Chroma không bao giờ đưa các quán ở Tây Ban Nha vào tầm ngắm.

## 3. Vì sao chọn Postgres làm nguồn tìm kiếm chính

Postgres có đầy đủ trường có cấu trúc để lọc/xếp hạng chính xác theo đúng thứ người dùng cần:

- `countries.name`, `states.name` → khớp chính xác theo địa lý (không phụ thuộc mật độ review).
- `venues.type` → khớp loại địa điểm (bar/restaurant/...).
- `hotels.extra.google_map.lgbtq_friendly` (boolean, có ở cả 62/62 hotel) → tín hiệu "thân thiện LGBTQ+" rõ ràng, không cần suy luận từ text.

→ Cách tiếp cận: **port lại logic `scoreOf()` của `mock.ts`** (đã được chứng minh hoạt động tốt) sang dữ liệu thật:

```
+8  nếu tên state (vd "Catalonia") xuất hiện trong câu hỏi
+5  nếu tên country (vd "Spain") xuất hiện trong câu hỏi
+3  nếu loại địa điểm khớp (vd "bar")
+2  nếu tên riêng địa điểm khớp 1 từ trong câu hỏi (>=4 ký tự)
+1  nếu có cờ lgbtq_friendly=true (hotel) hoặc có bằng chứng LGBT trong Chroma (venue)
```

Bắt buộc phải có ít nhất 1 khớp thành phố/quốc gia thật thì mới tin kết quả — nếu không, trả về rỗng thay vì đoán bừa.

### Vai trò còn lại của Chroma: tín hiệu phụ, không phải nguồn tìm kiếm

Sau khi Postgres đã chọn đúng ứng viên theo địa lý, Chroma được dùng thêm 1 bước:

```js
collection.get({ where: { lgbt_mention: true }, include: ["metadatas"], limit: 4000 })
```

Đây là truy vấn **lọc theo metadata** (không phải similarity search) — lấy tập id các entity có bằng chứng nhắc tới chủ đề LGBT trong review, rồi cộng thêm +1 điểm cho các ứng viên Postgres đã lọc sẵn theo vị trí. Cách dùng này tận dụng đúng thế mạnh của Chroma (tìm bằng chứng định tính) mà không phụ thuộc vào nó để trả lời câu hỏi "ở đâu".

## 4. Kết quả sau khi sửa

| Câu hỏi | Trước (Chroma primary) | Sau (Postgres primary) |
|---|---|---|
| "gay-friendly bar in Barcelona" | Quán ở Hồ Chí Minh + khách sạn Brighton | 5 quán bar thật ở Catalonia, Tây Ban Nha |
| "Is ibis Brighton City Centre hotel LGBTQ+ friendly?" | Đúng (do khách sạn này có rất nhiều review, tình cờ nằm trong top-K) | Đúng, và xếp hạng #1 rõ ràng nhờ khớp tên |
| "gay bar in Wakanda" (thành phố hư cấu) | — | Trả về rỗng đúng như kỳ vọng |

## 5. Bài học chung

Vector/semantic search phù hợp để trả lời *"nội dung nào giống câu hỏi nhất"*, không phù hợp để trả lời *"cái gì thỏa một ràng buộc cứng (vị trí, loại, cờ boolean)"* — trừ khi ràng buộc đó được nhúng rõ ràng vào bản thân vector (không phải trường hợp ở đây) hoặc được lọc bằng metadata filter trước/sau khi search. Với dữ liệu có cấu trúc sẵn (SQL), luôn ưu tiên SQL cho phần lọc cứng, và chỉ dùng vector search cho phần "tìm ý nghĩa/bằng chứng" mà SQL không biểu diễn được.
