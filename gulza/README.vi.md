# GULZA — Công cụ tạo video lời bài hát và phụ đề chuyển động miễn phí

**[Dùng trang web tiếng Việt](https://ruruoni1.github.io/gulza/vi/)** · [Bản gốc tiếng Hàn](README.md) · [JIZURA gốc](https://github.com/852wa/JIZURA)

**Ngôn ngữ khác:** [한국어](README.md) · [日本語](README.ja.md) · [English](README.en.md) · [繁體中文](README.zh-Hant.md) · [简体中文](README.zh-Hans.md) · [Bahasa Indonesia](README.id.md)

GULZA là công cụ miễn phí trên trình duyệt để tạo video chuyển động từ lời bài hát và phụ đề, rồi lưu thành MP4.

Tên gọi bắt nguồn từ “글자”, một từ tiếng Hàn có nghĩa là chữ viết.

Dự án dựa trên 860 thành phần hiệu ứng và 27 phong cách của [JIZURA](https://github.com/852wa/JIZURA).

Bản fork này nhập trực tiếp tệp phụ đề SRT mà không cần chuyển sang LRC trước.

**Phiên bản hiện tại: v0.16.1** · Dùng [trang web](https://ruruoni1.github.io/gulza/vi/) mà không cần cài đặt hay tạo tài khoản. Địa chỉ chính mở bằng tiếng Hàn; bạn có thể đổi ngôn ngữ giao diện ở đầu trang. · [Lịch sử thay đổi](CHANGELOG.md)

## Các tính năng được bổ sung trong bản fork

- **Nhập SRT trực tiếp:** Mở tệp `.srt` nguyên gốc để bắt đầu làm video phụ đề. Những đoạn không có phụ đề vẫn được giữ lại.
- **Hỗ trợ tệp phụ đề tiếng Hàn:** Đọc SRT/LRC mã hóa UTF-8, UTF-16 hoặc Windows tiếng Hàn, tối đa 2 MB.
- **Xuất LRC:** Lưu thời điểm bắt đầu của từng phụ đề vào LRC. Để giữ cả thời điểm kết thúc, hãy lưu dự án chứa SRT.
- **Đổi ngôn ngữ giao diện:** Mặc định là tiếng Hàn; cũng có tiếng Nhật, Anh, Trung Phồn thể/Giản thể, Indonesia và Việt.
- **Tên tệp GULZA:** Nếu chưa có tiêu đề, tệp được lưu với tên như `gulza.mp4`, `gulza.project.json`.

Dấu thời gian SRT xuất hiện trong ô lời dưới dạng `[SRT:00:00:01.000-->00:00:02.300]phụ đề`.

Sửa dấu thời gian cũng sẽ thay đổi thời điểm hiển thị phụ đề.

## Các tính năng chính

- **Cấu hình tự động:** Một nút `R` Tái tạo phong cách, tâm trạng, chuyển động, cách phối màu và cắt bố cục bằng các phím. Nếu bạn thay đổi hạt giống thì video sẽ khác.
- **Chỉnh sửa thời gian:** Bạn có thể phát hiện nhịp của nguồn âm thanh và đặt đoạn cắt hoặc chạm trực tiếp trong khi phát lại để chỉ định thời gian bắt đầu của dòng và đoạn cắt.
- **Cài đặt đầu ra:** Chọn tỷ lệ khung hình 16:9, 9:16, 4:3, 3:4, 1:1, 4:5, 21:9, độ phân giải 720p~4K, 24/30/60fps.
- **Video và Hình ảnh:** Bạn có thể xuất chuỗi MP4, PNG, PNG trong suốt và PNG được phân tách nền trước/nền. Bạn cũng có thể chọn giữa màn hình xanh và nền đen.
- **Lưu dự án:** Bạn có thể lưu và mở lại các chỉnh sửa của mình dưới dạng JSON và thậm chí xuất JSON cấu hình cho After Effects.

| tập tin trong kho lưu trữ | sử dụng |
|---|---|
| [`index.html`](index.html) | Màn hình tiếng Hàn mặc định cho Trang GitHub. Các ngôn ngữ khác trong mỗi thư mục `index.html`Nó ở trong |
| [`src/`](src/) · [`app/`](app/) | Động cơ chuyển động, màn hình, bản dịch tiếng Hàn và mã nguồn xây dựng |
| [`GULZA_AE.jsx`](GULZA_AE.jsx) | Bảng điều khiển After Effects ScriptUI tiếng Hàn cho GULZA |
| [`GULZA_CEP.zip`](GULZA_CEP.zip) | Bảng điều khiển After Effects CEP tiếng Hàn cho GULZA |
| [`ae/`](ae/) · [`cep/`](cep/) | Nguồn và tài liệu cài đặt cho bảng After Effects |
| [`docs/EXPRESSION_PACKS.md`](docs/EXPRESSION_PACKS.md) | Tài liệu dành cho nhà phát triển thêm các phần biểu cảm |

## Bắt đầu

1. [trang web GULZA](https://ruruoni1.github.io/gulza/vi/)Mở .
2. **Tải SRT/LRC**Chọn tệp phụ đề bằng , hoặc viết chúng trực tiếp từng dòng trong trường nhập lời bài hát.
3. Nếu có nguồn âm thanh, hãy tải nó. Bạn có thể tạo video có phụ đề ngay cả khi không có nguồn âm thanh.
4. **Tạo tự động**Nhấn và kiểm tra bản xem trước. Điều tôi thích là **Trước / Tiếp theo**Bạn có thể chọn lại nó.
5. Sau khi cài đặt tỷ lệ màn hình, độ phân giải và tốc độ khung hình, **Xuất MP4**Nhấn .

### môi trường sử dụng

Xuất MP4 yêu cầu hỗ trợ WebCodecs trong trình duyệt của bạn. Nên sử dụng Chrome và Edge.

Các codec có sẵn sẽ khác nhau tùy thuộc vào trình duyệt và hệ điều hành của bạn. Ngay cả khi không thể tạo MP4, bạn vẫn có thể xem trước và xuất các chuỗi PNG.

Bạn cũng có thể chỉnh sửa nó trên điện thoại thông minh của mình. PC phù hợp hơn với video dài hoặc đầu ra có độ phân giải cao.

Các phông chữ cần thiết được tải từ Google Fonts. Khi ngoại tuyến, phông chữ trên thiết bị của bạn có thể dự phòng.

## Tự động tạo và tinh chỉnh

của màn hình **Đơn giản / Nâng cao**Thay đổi chế độ chỉnh sửa trong .

Ở chế độ đơn giản **Tạo tự động**Nhấn để chọn lại tất cả các mục sau cùng một lúc.

- Kiểu, màu nền và phông chữ được sử dụng trong tiêu đề và nội dung
- Tâm trạng: Glitch, chill, pop, đồ họa, biên tập, cảm xúc, một sự kết hợp tổng thể. Nếu bật tính năng đạo diễn kinh dị thì kinh dị cũng sẽ được đưa vào danh sách ứng cử viên.
- Cường độ của chuyển động, số lượng trục trặc và trang trí cũng như các phần biểu cảm được sử dụng.
- Cắt cấu hình và hạt giống

**Trước / Tiếp theo**Bạn có thể chuyển qua lại giữa các bản ghi được tạo bằng .

**Chỉ cần thay đổi phần này**duy trì thiết kế hiện tại và chỉ chọn một trong những thứ sau: kiểu dáng, cách phối màu, bầu không khí và bố cục.

Lời bài hát, nguồn âm thanh, thời gian, cài đặt đầu ra và các dòng bị khóa sẽ được tạo tự động và không thay đổi.

### Phạm vi biểu thức được sử dụng để tạo tự động

Bạn có thể giới hạn các ứng cử viên cho việc tạo tự động, xáo trộn và vẽ lại theo dòng bằng cách kiểm tra các mục.

Bạn có thể sử dụng biểu thức của riêng mình bất kể hạn chế này.

| mục  | trạng thái ban đầu | Nó hoạt động như thế nào |
|---|---|---|
| Chỉ đạo bổ sung cũng được sử dụng | Tắt | Khi được bật, nó cũng sẽ đưa vào danh sách rút gọn các biểu thức, kiểu và phông chữ được thêm vào 356 phần và 12 kiểu trong bản phát hành sớm. |
| Chỉ đạo kiểu Nhật Bản cũng được sử dụng. | TRÊN | Các ứng cử viên bao gồm các biểu hiện mang phong cách Nhật Bản như đèn lồng, shoji, quạt, hoa anh đào và hoa văn truyền thống. |
| Sử dụng các thành phần kiểu chữ | TRÊN | Chúng tôi sử dụng 50 phần cho hình ảnh ký tự được thể hiện qua dòng, số, khoảng cách giữa các chữ và cách sắp chữ. |
| Sử dụng các thành phần động học | TRÊN | Nó sử dụng 51 phần trong đó các từ di chuyển, xếp chồng hoặc giao nhau. |
| Chỉ đạo kinh dị cũng được sử dụng. | Tắt | Sử dụng 52 phần kinh dị và 3 phong cách liên quan và thêm phần kinh dị vào bầu không khí được tạo tự động của bạn. |

Trong danh sách biểu thức, các phần bổ sung, phong cách Nhật Bản, kiểu chữ, động học và phần kinh dị đều được đánh dấu.

Các mục không được chọn tự động trong cài đặt hiện tại sẽ bị mờ đi.

### màn hình di động

Khi màn hình hẹp hoặc bạn thao tác bằng cảm ứng **di động** chế độ có sẵn.

Các nút và bản xem trước được tạo tự động sẽ hiển thị ngay cả khi cuộn. Chỉnh sửa danh sách dòng bằng cách chỉ mở rộng những dòng bạn cần.

Lưu, mở và đặt lại được thu thập trong menu. Độ phân giải đầu ra đầu tiên ở chế độ di động là 720p.

### Thay đổi bảng màu

**Nâng cao → Kiểu → Màu nhấn/Màu bù**Tại **phối màu ngẫu nhiên**Nhấn để chọn lại hai màu.

Bạn có thể tạo các kết hợp mới từ các kết hợp có sẵn hoặc từ bánh xe màu. Độ sáng của màu cũng được điều chỉnh để văn bản có thể đọc được theo độ sáng của nền.

Bạn cũng có thể tự mình chỉ định màu sắc. Nếu bạn xóa màu bạn đã chỉ định, màu đó sẽ trở về màu mặc định của kiểu.

## Hướng dẫn chi tiết chỉnh sửa trên trình duyệt

### Lời bài hát và ký hiệu phụ đề

Thông thường, một dòng lời bài hát là một cụm từ.

Các dòng trống tạo ra một khoảng cách ngắn.

| Ví dụ đầu vào | nghĩa |
|---|---|
| `새벽의 색을/기억하고 있어` | `/`Chia các vết cắt thành . |
| `*투명*` | Nhấn mạnh từ này. |
| `마지막 문장!` | Thêm đèn flash và lắc lư vào cuối dòng. |
| `가사\|작은 메모` | Thêm văn bản nhỏ cho ý kiến. |
| `[01:23.45]가사` | Áp dụng thời gian bắt đầu LRC. |
| `[간주 8]` | Nó chỉ hiển thị nền và trang trí trong 8 giây mà không có bất kỳ lời bài hát nào. Nếu không có số thì là 4 giây. |
| `# 메모` | Điều này được coi là chú thích tác phẩm và sẽ không được đưa vào video. |

**Tải SRT/LRC**Nếu bạn mở tệp bằng , lời bài hát hiện tại sẽ thay đổi. Một cửa sổ xác nhận sẽ mở ra trước khi thay đổi.

Ngay cả sau khi gọi **hoàn nguyên**Bạn có thể khôi phục trạng thái trước đó bằng .

SRT duy trì thời gian bắt đầu và kết thúc. LRC chỉ có thể chứa thời gian bắt đầu.

### Nguồn âm thanh và thời gian

- Khi bạn tải nguồn âm thanh, nó sẽ phát hiện BPM và đánh nhịp cũng như điều chỉnh các ranh giới cắt gần với nhịp hơn. Nhạc đã tải sẽ được lưu giữ trong cùng một trình duyệt và có thể được khôi phục khi bạn mở lại trang.
- **Đồng bộ hóa với các tab:** Khi mỗi dòng bắt đầu `Space`Nhấn . Nếu bạn nhấn nhầm nút `Backspace`Tôi **hoàn nguyên một**Sử dụng .
- **Bắt đầu lại từ giữa:** Nhấn nút Đồng bộ trong danh sách dòng.
- **Tab tính năng phụ trợ:** Bạn có thể giảm tốc độ phát xuống 0,75x hoặc 0,5x hoặc bật đếm ngược. Thời gian lưu là thời gian ban đầu của bài hát.
- **Cắt thời gian:** Khi có nhiều vết cắt trên một dòng, khi chuyển đổi `Tab`Nhấn .
- Bạn có thể nhập trực tiếp thời gian bắt đầu của danh sách dòng dưới dạng số hoặc điều chỉnh bằng cách kéo đường viền của dòng thời gian. Bạn cũng có thể phóng to/thu nhỏ dòng thời gian và di chuyển vị trí phát lại.
- Lời bài hát và thời gian thay đổi **hoàn nguyên** hoặc `Ctrl+Z`Bạn có thể hủy bằng .

### Chỉnh sửa dòng và cắt riêng biệt

Bạn có thể chỉnh sửa dòng đó bằng cách nhấn nút bút chì trong danh sách dòng hoặc nhấp đúp vào lời bài hát.

Số lần cắt trên mỗi đường có thể được đặt thành tự động hoặc từ 1 đến 6. Bạn cũng có thể chỉ vẽ lại đường đó bằng xúc xắc.

Khi được bật, khóa sẽ duy trì bố cục và cách phối màu của các đường nét. **xáo trộn**kéo lại toàn bộ cấu hình mà không khóa nó.

**chủ đề**Nếu bạn chọn một trong các Video văn bản, Kinetic, Phong cách Nhật Bản, Kinh dị, Pop hoặc Ballad, hướng tạo tự động sẽ bị thu hẹp.

Ở chế độ nâng cao, bạn có thể thay đổi bố cục, giao diện, bảo trì, thoát, trang trí, hiệu ứng văn bản, nền, camera và chuyển tiếp cho mỗi lần cắt.

Khóa phân loại và khóa giá trị trình bày được duy trì ngay cả sau khi tạo tự động và cũng được lưu trong tệp dự án.

bên cạnh để chơi **lặp lại**thay đổi theo thứ tự sau: Tất cả → Dòng → Cắt → Không lặp lại.

Phạm vi lặp lại được hiển thị trên dòng thời gian.

### Phong cách, hướng, phông chữ

27 kiểu là các cài đặt kết hợp sự kết hợp màu sắc, phông chữ và kết cấu.

Có phong cách hoa anh đào, biển sâu, hoàng hôn, báo, giấy, tổng hợp và kinh dị. Ngay cả trong một video, hình nền có thể thay đổi sau mỗi lần cắt.

Phông chữ được tải khi cần thiết. Tên phông chữ được cài đặt trên PC của bạn `.ttf`·`.otf` Bạn cũng có thể thay đổi nó thành một tập tin.

**Nâng cao → Định hướng**Điều chỉnh chuyển động, trục trặc, lệch màu, trang trí, mật độ cắt, kết cấu và giữ khung.

Ngay cả khi bạn ẩn số và thời gian trang trí, bản thân những con số được viết trong lời bài hát sẽ vẫn còn.

**Nâng cao → Kỹ thuật**Bạn có thể bật và tắt 10 loại phần biểu thức riêng lẻ. Nó cũng cung cấp tính năng tìm kiếm tên và bật/tắt/đảo ngược hoàn toàn.

**tinh thần đoàn kết**Khi được bật, các phần riêng biệt và lời bài hát lặp lại sẽ có bố cục và chuyển động tương tự nhau. Đặt hướng mạnh vào những đường cần nhấn mạnh.

**căn chỉnh ký tự**Điều chỉnh kích thước phông chữ, khoảng cách và trang trí. Cả hai tùy chọn đều có thể được tắt.

**Giữa trống (dành cho ký tự)**Đảm bảo không gian ở trung tâm để tổng hợp các hình ảnh khác.

Lời bài hát được đặt ở bên trái và bên phải trên màn hình ngang, trên và dưới hoặc trái và phải trên màn hình dọc.

Các đường chấm trong phạm vi hiển thị bản xem trước sẽ được để trống và sẽ không được đưa vào đầu ra.

### Định dạng và phạm vi đầu ra

| hình thức | Sử dụng |
|---|---|
| MP4 | Video đã hoàn thành. Nếu bạn có nguồn âm thanh, bạn có thể bao gồm nó. |
| Chuỗi ZIP PNG | Được sử dụng khi tập hợp các hình ảnh theo từng khung hình trong các trình chỉnh sửa khác. |
| ZIP PNG trong suốt | Được sử dụng để kết hợp văn bản và bản trình bày không có nền. |
| Tách biệt ZIP nền trước và nền sau | `front/`Và `back/` Lưu các phần tử mặt trước và mặt sau của một khung riêng biệt trong một thư mục. |
| LRC | Đây là file lời bài hát ghi lại thời gian bắt đầu của mỗi dòng. |
| JSON cho After Effects | Được sử dụng để truyền thông tin cấu hình và thời gian hiện tại tới bảng GULZA AE. |

**phạm vi xuất khẩu**Nếu bạn chọn dòng đầu tiên hoặc dòng cuối cùng thì chỉ dòng được chọn sẽ được in. Trong tên tập tin `_L03-05`Số dòng được thêm vào như sau.

Trong Chrome·Edge, bạn có thể quay video lớn trực tiếp vào tệp bạn muốn lưu. Nếu mã hóa GPU không thành công, hãy thử phương pháp khác.

Nếu trình duyệt của bạn không lưu được âm thanh AAC, một tệp WAV riêng biệt có thể được lưu cùng với nó.

**lời bài hát rõ ràng**Xóa thời gian, chỉ định và phạm vi đầu ra cho từng lời bài hát và dòng. Hành động này có thể đảo ngược.

**cài lại**xóa nhạc đã lưu, cài đặt và thậm chí cả lịch sử công việc. Nó sẽ được thực thi sau khi xác nhận và không thể đảo ngược.

Các tệp JSON dự án được tải xuống riêng biệt sẽ không bị xóa.

### Tốc độ khung hình và chuyển động

Chọn tốc độ khung hình đầu ra từ 24/30/60fps. Tốc độ khung hình và kết cấu chuyển động là các cài đặt riêng biệt.

- **Giữ 2 khung:** Chuyển động của 12 bức ảnh mỗi giây tạo ra cảm giác mất kết nối.
- **Giữ 3 khung:** 8 bức ảnh mỗi giây tạo cảm giác đông lạnh hơn.
- **toàn bộ:** Nó di chuyển ở mỗi khung hình / giây đầu ra đã chọn để có trải nghiệm mượt mà nhất có thể.

60fps và 4K mất nhiều thời gian hơn để xuất ra.

### Màn hình xanh, nền đen và PNG trong suốt

Để đặt lời bài hát lên trên một video khác **Xuất → Nền**Chọn giữa màn hình xanh, nền đen hoặc nền trơn.

màn hình xanh là màu xanh `#00FF00`, nền đen là đen `#000000`Sử dụng . Cài đặt được phản ánh trong cả bản xem trước và đầu ra.

Trong tên tập tin `_greenback` hoặc `_blackback`Điều này được đính kèm.

Xóa màn hình xanh bằng phím sắc độ và xóa nền đen bằng phím bố cục màn hình hoặc phím độ sáng.

Nếu bạn chọn PNG trong suốt, bạn có thể kết hợp nó mà không cần xóa nền. Trong ZIP tách nền trước và nền sau, `front/`dàn diễn viên `back/` Đặt nó lên trên.

Hiệu ứng đèn flash và màn hình có thể được áp dụng thành hai lớp, vì vậy hãy kiểm tra kết quả tổng hợp.

### Ngôn ngữ và phông chữ lời bài hát

**ngôn ngữ lời bài hát**Mặc định là tự động phát hiện. Xác định ngôn ngữ bằng cách nhìn vào Hangul, Kana, ký tự tiếng Trung và tiếng Anh.

Nếu kết quả không khớp, bạn có thể chọn giữa tiếng Hàn, tiếng Nhật, tiếng Trung (Phồn thể/Giản thể) và tiếng Anh. Bản thân màn hình vẫn bằng tiếng Hàn.

| Họ phông chữ kiểu gốc | Ví dụ về phông chữ tương ứng trong lời bài hát tiếng Hàn |
|---|---|
| Noto Sans JP·Zen Kaku Gothic New | Noto Sans KR |
| Noto Serif JP·Zen Old Mincho | Noto Serif KR |
| Dela Gothic One | Black Han Sans |
| M PLUS Rounded 1c | Jua |
| Mochiy Pop One·Kiwi Maru | Do Hyeon·Gowun Dodum |
| Klee One·Yuji Syuku | Gowun Batang·Nanum Brush Script |

Trong lời bài hát tiếng Anh, các đoạn cắt được chia thành nhiều từ. `/`Nếu có một vị trí được chia trực tiếp cho , phép chia đó được thực hiện theo.

Lựa chọn ngôn ngữ của bạn cũng được lưu trữ trong JSON dự án của bạn.

### Hướng dẫn cho người dùng lần đầu

Khi mới mở trang web, bạn sẽ được hướng dẫn theo thứ tự sau: Lời bài hát → Nguồn âm thanh → Tự động tạo → Xem trước → Chỉnh sửa theo dòng → Xuất.

đứng đầu **?** Bạn có thể mở lại nó bằng một nút bấm.

Cài đặt âm lượng xem trước và tắt tiếng được trình duyệt ghi nhớ. Âm lượng xem trước không làm thay đổi âm lượng của MP4 đầu ra.

## 860 phần biểu thức

860 phần biểu cảm bao gồm 356 phần gốc, 351 phần bổ sung, 50 phần typographic, 51 phần động học và 52 phần kinh dị.

Bạn có thể kết hợp các phần theo danh mục trong một lần cắt. Bạn có thể sử dụng nhiều đồ trang trí.

| Nhóm | Số lượng | Ví dụ hiệu ứng |
|---|---:|---|
| Bố cục | 184 | Căn giữa, chữ dọc, bong bóng thoại, giấy viết, danh đề cuối |
| Xuất hiện | 125 | Tách rồi ghép, cắt lát, domino, đèn neon bật sáng |
| Duy trì | 52 | Rung nhẹ, lơ lửng, nhịp đập theo tiết tấu, chuyển tiêu điểm |
| Biến mất | 109 | Bùng nổ, đóng cửa, xóa, kính vỡ |
| Trang trí | 130 | Tâm ngắm, radar, cánh hoa, chòm sao |
| Hiệu ứng chữ | 62 | Viền, phát sáng, tô sáng, lệch màu |
| Nền | 66 | Lưới, cực quang, trời đêm, cửa sổ mưa |
| Máy quay | 36 | Phóng to, di chuyển, rung, xoay |
| Hiệu ứng hình ảnh | 69 | Nhiễu glitch, đảo màu, lóe sáng, VHS |
| Chuyển cảnh | 27 | Xóa tuyến tính, đẩy, rèm, khảm |

Các bộ phận có thẻ tâm trạng. Việc tạo tự động trước tiên sẽ chọn các bộ phận phù hợp với môi trường đã chọn.

Bộ biểu thức cơ bản bao gồm các phần bố cục, lối vào, chỗ ở và lối ra, cũng như các hiệu ứng trục trặc, đèn flash và kết cấu.

## Bảng điều khiển After Effects

Có hai bảng điều khiển được xây dựng với tên GULZA: ScriptUI và CEP.

Tên menu, composition được tạo, tên tệp báo cáo chẩn đoán và ID tiện ích CEP đều dùng tên GULZA.

Lệnh **Xuất cho AE** trên trình duyệt lưu thời điểm bắt đầu và kết thúc từng cảnh vào JSON.

Bảng ScriptUI áp dụng các thời điểm này cho điểm đầu và cuối của lớp AE.

| Loại | Tệp | Công dụng |
|---|---|---|
| ScriptUI | [`GULZA_AE.jsx`](GULZA_AE.jsx) | Tạo composition từ lời bài hát trong AE hoặc đọc JSON bố cục từ trình duyệt. |
| CEP | [`GULZA_CEP.zip`](GULZA_CEP.zip) | Dùng giao diện biên tập trình duyệt tiếng Hàn trong bảng AE. |

### Cài đặt ScriptUI

1. Tải `GULZA_AE.jsx`.
2. Đặt tệp vào `Scripts/ScriptUI Panels` trong thư mục cài đặt AE.
3. Khởi động lại AE rồi mở **Window → GULZA_AE.jsx**.

Chọn lời bài hát, phong cách, kích thước khung hình và hiệu ứng để tạo composition.

Thời điểm bắt đầu có thể tính tự động hoặc lấy từ marker trên lớp âm thanh được chọn hay composition.

Bạn cũng có thể đọc **JSON dành cho AE** từ trình duyệt để tạo composition với thời gian và bố cục tương ứng.

Lời bài hát được tạo vẫn là các lớp văn bản có thể chỉnh sửa.

### Cài đặt CEP

1. Tải và giải nén `GULZA_CEP.zip`.
2. Chạy `install_win.bat` hoặc `install_mac.command` theo hệ điều hành.
3. Khởi động lại AE rồi mở **Window → Extensions → GULZA**.

CEP dành cho AE 2022 trở lên. ID tiện ích (`com.ruruoni1.gulza`) khác với bảng JIZURA gốc.

Trình cài đặt sao chép bảng vào thư mục tiện ích CEP của người dùng và bật chế độ chạy bảng CEP chưa ký.

Xem [hướng dẫn cài đặt CEP](cep/dist/README_CEP.md) để biết chi tiết.

Cả hai bảng đều có chế độ tạo nhẹ, điều khiển tiến trình/dừng và báo cáo chẩn đoán.

Máy tính dùng cho bản phát hành này không có After Effects, nên hoạt động thực tế bên trong AE chưa được xác nhận.

## Phát triển và phân phối

Phiên bản trình duyệt được xây dựng từ kho lưu trữ gốc như sau:

```sh
python build.py
```

`src/`, `app/`, `vendor/`từ gốc của `index.html`lớp học `sitemap.xml`tạo ra .

Trang GitHub `main` Xuất bản kho lưu trữ gốc của chi nhánh. [địa chỉ mặc định](https://ruruoni1.github.io/gulza/vi/)là màn ảnh Hàn Quốc.

HTML cho tiếng Nhật, tiếng Anh, tiếng Trung (Phồn thể, Giản thể), tiếng Indonesia và tiếng Việt cũng được tạo trong mỗi thư mục ngôn ngữ.

Các công cụ xây dựng dành riêng cho After Effects ban đầu cũng có trong kho lưu trữ.

```sh
node tools/export_ae_data.js
python build_ae.py
python build_cep.py
```

Phiên bản trình duyệt là [`VERSION`](VERSION), lịch sử thay đổi là [`CHANGELOG.md`](CHANGELOG.md)Viết nó ra.

Để thêm một phần biểu thức [`docs/EXPRESSION_PACKS.md`](docs/EXPRESSION_PACKS.md)Vui lòng tham khảo.

Nếu bạn đã tạo lại đầu ra AE·CEP, bạn phải kiểm tra riêng nó trong After Effects.

## Cập nhật gần đây

- **v0.16.1:** Trang web đã có ảnh xem trước khi chia sẻ theo từng ngôn ngữ, favicon, dữ liệu có cấu trúc và mô tả tìm kiếm đầy đủ hơn.
- **v0.16.0:** Chủ đề ở chế độ đơn giản giờ có hai cấp: 9 chủ đề chính và 35 chủ đề phụ. Chủ đề phụ quyết định không khí, phong cách và kỹ thuật khi tạo ngẫu nhiên, đồng thời bật các công tắc cần thiết.
- **v0.15.7:** Dòng dài hơn 20 ký tự (không tính khoảng trắng) giờ sẽ hiện cảnh báo; có thể nhảy đến dòng đó để sửa hoặc giữ nguyên và tiếp tục.
- **v0.15.6:** Đã dịch toàn bộ 860 tên kỹ thuật trên giao diện tiếng Indonesia và tiếng Việt, đồng thời sửa các tên gượng gạo hoặc trùng lặp trong tiếng Hàn, tiếng Anh và tiếng Trung.
- **v0.15.5:** Giao diện tiếng Hàn giờ hiển thị tên tiếng Hàn cho 315 kỹ thuật trước đây còn để khóa tiếng Anh.
- **v0.15.4:** Lặp lại khi xem trước giờ tắt theo mặc định; nút Lặp chuyển lần lượt: toàn bộ → dòng → cảnh → tắt.
- **v0.15.3:** Đã dịch nút nhập SRT và các thông báo còn để tiếng Nhật trên giao diện tiếng Trung, tiếng Indonesia và tiếng Việt.
- **v0.15.2:** Khi lưu dự án, JSON cho AE và LRC, giờ có thể đổi tên tệp; nếu chưa có tên bài, tên tệp âm thanh đã tải sẽ được dùng.
- **v0.15.1:** Khoảng trống giữa các phụ đề SRT giờ chỉ hiện nền và họa tiết, không còn số đếm ngược.
- **v0.15.0:** Cảnh thứ 2 và thứ 4 trong video mẫu tiếng Hàn được kéo dài, còn thứ tự và số cảnh vẫn giữ nguyên.
- **v0.14.9:** Khôi phục cách chia cảnh tự động của video mẫu; chỉ điều chỉnh thời lượng mỗi câu ở giữa bản cũ và bản chậm hơn.
- **v0.14.8:** Video mẫu mặc định giữ mỗi câu lâu hơn và giảm chuyển cảnh quá nhanh giữa câu.
- **v0.14.7:** Thanh công cụ tiếng Indonesia và tiếng Việt nay nằm trên một hàng ở màn hình máy tính dù nhãn dài hơn.
- **v0.14.6:** Các nút điều khiển và liên kết phía trên nằm trên cùng một hàng ở màn hình rộng. Tiêu đề và nút trong bảng lời bài hát xuống dòng gọn gàng khi cột hẹp.
- **v0.14.5:** Thu gọn bộ chọn ngôn ngữ thành `🌐 LN` và tên ngôn ngữ đang chọn. Liên kết GitHub và GoverseTV được căn về bên phải các nút trên thanh công cụ.
- **v0.14.4:** Thêm liên kết đến kho GitHub GULZA và kênh YouTube GoverseTV ở thanh trên cùng của trang. Trên điện thoại, mở menu để tìm các liên kết này.
- **v0.14.3:** Video mẫu ở cả bảy ngôn ngữ kể cùng một câu chuyện: nguồn gốc tên GULZA, con chữ bắt đầu chuyển động, phụ đề trở thành cảnh phim và lời nói trở thành video.
- **v0.14.2:** Thêm video mẫu GULZA cho từng ngôn ngữ. Mẫu chưa chỉnh sửa sẽ đổi theo ngôn ngữ giao diện.
- **v0.14.1:** Hoàn thiện hướng dẫn bằng sáu ngôn ngữ và giúp người dùng dễ tìm bộ chọn ngôn ngữ hơn.
- **v0.14.0:** Phát hành lại trang web bằng bảy ngôn ngữ, mặc định là tiếng Hàn.

[Toàn bộ lịch sử thay đổi (tiếng Hàn)](CHANGELOG.md) · [Bản phát hành GitHub v0.16.1](https://github.com/ruruoni1/gulza/releases/tag/v0.16.1)

## Người đóng góp và giấy phép ban đầu

Dự án này [852wa/JIZURA](https://github.com/852wa/JIZURA)Nó là một nhánh dựa trên .

Chúng tôi cũng kế thừa bản dịch và đóng góp tính năng được ghi trong README gốc.

- [Zaious](https://github.com/Zaious): Tên màn hình/bộ phận, phông chữ và nhận dạng ngôn ngữ tiếng Trung được cải thiện
- [andongmin94](https://github.com/andongmin94): Bản dịch tên màn hình/bộ phận tiếng Hàn
- [auliaramadhann](https://github.com/auliaramadhann), [enka25](https://github.com/enka25): Dịch màn hình tiếng Indonesia
- [nocore-dtm](https://github.com/nocore-dtm): Cắt xem trước, đồng bộ hóa tab, phát lặp lại, thay thế và khóa riêng lẻ
- [phamhuulocforwork](https://github.com/phamhuulocforwork): Dịch màn hình tiếng Việt

Nguồn của công cụ này là [Giấy phép MIT](LICENSE)Theo.

Quyền đối với video và hình ảnh được tạo bằng công cụ này thuộc về người sáng tạo. Quyền đối với phụ đề, lời bài hát và nguồn âm thanh được sử dụng thuộc về chủ sở hữu quyền tương ứng.

Phụ đề và âm thanh được xử lý trong trình duyệt và không được tải lên máy chủ. Các phông chữ cần thiết được tải từ Google Fonts.

Thông báo phần mềm bên ngoài [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md)Nó ở trong
