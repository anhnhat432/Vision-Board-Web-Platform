# 12-Week Setup Lab — AI Simulated User Test Report

## 1. Summary

Mình đã thực hiện simulated user testing cho route [`/12-week-setup-lab`](src/features/plan12week/pages/12WeekSetupLab.tsx) theo 3 persona: học tập, project, sức khỏe. Đánh giá này dựa trên test plan ở [`docs/ux/12-week-setup-lab-user-test-plan.md`](docs/ux/12-week-setup-lab-user-test-plan.md) và quan sát copy / layout / flow trong các step của lab.

Kết luận tổng quát: **POLISH**.

Lý do:

- Step 1 nhìn chung dễ hiểu, nhưng thuật ngữ “Kết quả cuối 12 tuần” vẫn hơi trừu tượng với user ít quen framework.
- Step 2 có hỗ trợ phân biệt “Việc lặp lại” và “Chỉ số kết quả”, nhưng copy giải thích còn nặng khái niệm, đặc biệt với persona sức khỏe.
- Step 3 ổn hơn về mặt thao tác, nhưng “Ngày nhìn lại tuần” và “Mức tải tuần đầu” vẫn cần diễn đạt đời thường hơn để giảm cảm giác phải hiểu framework trước khi dùng.
- Step 4 cho thấy bản preview khá đầy đủ, nhưng cụm “scorecard/điểm thực thi” và kỳ vọng sau khi bấm lưu vẫn chưa đủ rõ với user mới.

## 2. Persona-by-persona walkthrough

### Persona 1 — Học tập: TOEIC 650 trong 12 tuần

#### Step 1 — Kết quả

- Persona này **hiểu tương đối tốt** rằng cần điền một đích đến cuối chu kỳ, nhất là khi có ví dụ như điểm mock test hoặc số đề hoàn thành.
- Tuy vậy, họ có xu hướng đọc “Kết quả cuối 12 tuần” như một mục tiêu học hằng ngày nếu không có ví dụ cụ thể bên dưới.
- Field gây mơ hồ nhất:
  - `Kết quả cuối 12 tuần`
  - `Con số mục tiêu`
  - `Tên chỉ số cần theo dõi`
- Friction chính: user học tập thường nghĩ theo “hôm nay học gì”, nên cần nhấn mạnh đây là **trạng thái kết thúc sau 12 tuần**.

#### Step 2 — Việc lặp lại

- Persona này **phân biệt được ở mức khá**, đặc biệt nếu họ nhìn thấy ví dụ như học từ vựng, luyện nghe, làm đề.
- Tuy nhiên, họ vẫn có thể lẫn giữa “việc lặp lại” và “chỉ số kết quả” khi cả hai đều là số lượng.
- Ví dụ trong phần giải thích đủ dùng, nhưng còn mang tính template; user mới vẫn cần người hướng dẫn nhắc lại một lần.
- Friction chính: cụm “Chỉ số kết quả” khá đúng về mặt product, nhưng với người ít quen productivity app thì vẫn hơi kỹ thuật.

#### Step 3 — Lịch

- Persona này **hiểu được ngày nhìn lại tuần** nếu coi đó là lúc kiểm tra tiến độ học và điều chỉnh lịch.
- Mức tải tuần đầu tương đối dễ chọn, nhưng từ ngữ “mức tải” nghe hơi framework / quản lý hơn là ngôn ngữ học tập.
- Field nghe lạ nhất:
  - `Ngày nhìn lại tuần`
  - `Mức tải tuần đầu`
  - `Quỹ thời gian`
- Friction chính: họ muốn biết cụ thể hơn “tuần đầu cần học bao nhiêu buổi” thay vì phải giải nghĩa nhịp tuần trước.

#### Step 4 — Xác nhận

- Persona này **biết mình sắp lưu một kế hoạch 12 tuần** và nhìn thấy được preview có tuần 1, việc lặp lại, ngày bắt đầu, ngày nhìn lại.
- Họ hiểu tương đối tốt scorecard ở mức “điểm thực thi tuần”, nhưng cụm này chưa được nêu nổi bật bằng ngôn ngữ đời thường.
- Sau khi lưu, họ **có thể đoán** là sẽ sang màn weekly execution / Hôm nay, nhưng không đủ chắc nếu chỉ đọc preview.
- Mức tự tin ước lượng: **4/5**.

---

### Persona 2 — Project: MVP Vision Board để demo cho 10 người

#### Step 1 — Kết quả

- Persona này **hiểu khá nhanh** vì đã quen project/task.
- Họ ít nhầm kết quả cuối với task hằng ngày hơn persona 1, nhưng có nguy cơ đọc nó như một backlog milestone nếu copy quá dài hoặc quá nhiều chi tiết kỹ thuật.
- Field gây mơ hồ nhất:
  - `Vì sao mục tiêu này quan trọng?` vì nó kéo user về narrative cá nhân trong lúc họ đang nghĩ theo delivery.
  - `Tên chỉ số cần theo dõi` nếu chưa quen tách output metric và lead action metric.
- Friction chính: họ muốn một câu trả lời rất thực dụng: “cuối 12 tuần xong cái gì, demo cho ai, tiêu chí đạt là gì”.

#### Step 2 — Việc lặp lại

- Persona này **phân biệt tốt nhất trong 3 persona**.
- Deep work, review feedback, sửa bug là các ví dụ rất khớp mental model của họ.
- Tuy nhiên, phần “Việc lặp lại khác kết quả cuối thế nào?” vẫn hơi giống tài liệu hướng dẫn hơn là một khung nhập liệu nhanh.
- Ví dụ có đủ để tiếp tục, nhưng nếu họ đang ở trạng thái quá tải, họ vẫn cần người hướng dẫn nói ngắn gọn: “điền việc lặp lại là thứ làm đều mỗi tuần, còn chỉ số là thứ đo cuối kỳ”.

#### Step 3 — Lịch

- Persona này **hiểu ngày nhìn lại tuần khá rõ** vì họ đã có thói quen review sprint / tuần.
- Mức tải tuần đầu có thể được hiểu như capacity planning, nhưng với copy hiện tại vẫn hơi trừu tượng.
- Field ít lạ hơn với họ, nhưng vẫn có một chút ma sát ở `Mức tải tuần đầu` vì nó không gọi đúng tên “khối lượng công việc tuần đầu”.
- Họ cũng để ý `Ngày bắt đầu chu kỳ` và `Ngày kết thúc` khá nhanh.

#### Step 4 — Xác nhận

- Persona này **nắm được rằng họ đang lưu một plan có outcome, recurring actions, review day và week 1 preview**.
- Họ hiểu scorecard / điểm thực thi ở mức chấp nhận được, nhưng vẫn muốn biết rõ hơn điểm đó phản ánh outcome hay chỉ phản ánh completion rate.
- Sau khi lưu, họ **suy ra được** sẽ đi sang weekly execution/Hôm nay, nhưng copy ở màn xác nhận chưa khóa nghĩa này đủ chặt.
- Mức tự tin ước lượng: **4/5**.

---

### Persona 3 — Sức khỏe: Tập gym đều 3 buổi/tuần

#### Step 1 — Kết quả

- Persona này **dễ bị vấp nhất ở Step 1** vì họ nghĩ rất tự nhiên theo “đi tập hôm nay / tuần này” hơn là một outcome 12 tuần.
- Khi thấy `Kết quả cuối 12 tuần`, họ có thể hiểu nửa đúng: biết là mục tiêu dài hạn, nhưng chưa chắc tách được nó khỏi nhịp tập hằng tuần.
- Field gây mơ hồ nhất:
  - `Kết quả cuối 12 tuần`
  - `Con số mục tiêu`
  - `Tên chỉ số cần theo dõi`
- Friction chính: họ cần câu chữ đời thường hơn, ví dụ kiểu “Sau 12 tuần bạn muốn ổn định ở trạng thái nào?”

#### Step 2 — Việc lặp lại

- Persona này **hiểu được khái niệm hành động lặp lại** nếu ví dụ là gym 3 buổi/tuần.
- Tuy nhiên, phần `Chỉ số kết quả` vẫn dễ làm họ phân tâm vì họ không quen tách metric thành hai lớp.
- Đây là persona có khả năng cần người hướng dẫn giải thích thêm nhất ở Step 2.
- Ví dụ hiện tại đủ để bắt đầu, nhưng chưa đủ để user tự tin hoàn toàn mà không có coaching.
- Friction chính: ngôn ngữ như `mục tiêu tuần`, `chỉ số kết quả`, `điểm thực thi` còn mang cảm giác hệ thống hơn là kế hoạch tập luyện.

#### Step 3 — Lịch

- Persona này **có thể hiểu khá tốt** “Ngày nhìn lại tuần” nếu dịch ra đúng ngữ cảnh “xem tuần này có đi đủ 3 buổi không”.
- Mức tải tuần đầu nghe hơi xa lạ; họ sẽ hiểu tốt hơn nếu gọi là “nhẹ / vừa / nhiều” hoặc “tuần đầu dễ hay nặng”.
- Field lạ nhất:
  - `Mức tải tuần đầu`
  - `Quỹ thời gian`
  - `Ngày nhìn lại tuần`
- Friction chính: app đang nói theo logic plan, trong khi persona này cần logic thói quen đơn giản.

#### Step 4 — Xác nhận

- Persona này **biết mình sẽ lưu một kế hoạch**, nhưng không chắc lắm preview có giúp họ hiểu rõ tuần đầu sẽ trông như thế nào hay không.
- Scorecard / điểm thực thi có thể bị hiểu nhầm là “điểm chấm công” thay vì “điểm hoàn thành việc lặp lại”.
- Sau khi lưu, họ **có thể không chắc** sẽ đi sang weekly execution hay một màn tổng quan khác nếu chỉ dựa vào text hiện tại.
- Mức tự tin ước lượng: **3/5**.

## 3. Result table

| Persona  | Step 1 hiểu? | Step 2 hiểu?  | Step 3 hiểu?  | Step 4 tự tin? | Confidence | Main friction                                                        |
| -------- | ------------ | ------------- | ------------- | -------------- | ---------- | -------------------------------------------------------------------- |
| Học tập  | Có           | Có / Một phần | Có            | Có             | 4/5        | “Kết quả cuối 12 tuần” và “Mức tải tuần đầu” còn hơi framework       |
| Project  | Có           | Có            | Có            | Có             | 4/5        | Preview ở step 4 chưa nói rõ đủ về điểm thực thi và bước sau khi lưu |
| Sức khỏe | Một phần     | Một phần      | Có / Một phần | Một phần       | 3/5        | Thuật ngữ quá hệ thống; cần ngôn ngữ đời thường hơn                  |

## 4. Top UX issues

1. **Step 1 còn trừu tượng với user ít quen planning framework**
   - “Kết quả cuối 12 tuần” đúng về mặt khái niệm nhưng chưa đủ cụ thể cho người nghĩ theo hoạt động hằng tuần.

2. **Step 2 giải thích tốt nhưng vẫn nặng khái niệm**
   - Phân biệt “việc lặp lại” và “chỉ số kết quả” đã có ví dụ, nhưng copy vẫn hơi giống guide hơn là field support.

3. **Step 3 dùng thuật ngữ quản trị hơn ngôn ngữ hành vi**
   - “Mức tải tuần đầu”, “quỹ thời gian”, “ngày nhìn lại tuần” chưa đủ tự nhiên cho persona sức khỏe.

4. **Step 4 preview hữu ích nhưng chưa khóa được mental model sau khi lưu**
   - User biết sẽ lưu kế hoạch, nhưng chưa thật chắc bước tiếp theo là gì và scorecard được dùng để làm gì.

## 5. Copy issues

- `Kết quả cuối 12 tuần` → dễ bị hiểu như task cuối cùng hoặc mục tiêu chung chung.
- `Chỉ số kết quả` → đúng thuật ngữ product, nhưng hơi technical với user phổ thông.
- `Ngày nhìn lại tuần` → ổn nhưng chưa đủ đời thường; một số persona sẽ không biết đây là review moment.
- `Mức tải tuần đầu` → nghe giống nội bộ vận hành hơn là lựa chọn của người dùng.
- `Quỹ thời gian` → đúng nhưng khô; nhiều user sẽ không liên hệ ngay với thời lượng thực tế mỗi ngày.
- `Scorecard / điểm thực thi` → nên nói rõ hơn là điểm theo dõi mức hoàn thành việc lặp lại trong tuần.
- `Lưu kế hoạch` → user hiểu thao tác, nhưng chưa luôn hiểu sẽ đi đâu tiếp theo.

## 6. Layout issues

- Preview ở Step 4 chứa nhiều khối thông tin, nhưng **thứ tự thị giác chưa đủ kể một câu chuyện rõ ràng** cho user mới.
- `Kết quả cuối 12 tuần`, `Chỉ số kết quả`, `Ngày bắt đầu`, `Ngày nhìn lại tuần` đều là các card ngang cấp, nên người ít kinh nghiệm có thể chưa phân biệt được đâu là quyết định chính, đâu là metadata.
- Step 2 và Step 3 dùng nhiều `details` / khối phụ, nên người dùng có thể bỏ qua phần giải thích nếu họ đang đọc nhanh.
- Một số label mang tính hệ thống hơn ngôn ngữ đời thường, làm UI nhìn sạch nhưng chưa đủ “tự nói” với user mới.

## 7. Recommendation

**POLISH**

Lý do: flow cơ bản đã usable và có cấu trúc tốt, nhưng còn một lớp ma sát về copy và cách giải thích cho user ít quen framework. Chưa đủ nặng để NO-GO, nhưng chưa đủ tự tin để GO ngay nếu muốn dùng cho user thật ngoài lab.

### Nếu POLISH, task nhỏ theo mức ưu tiên

#### P0

- Rút ngắn hoặc viết lại copy ở Step 1 để nhấn mạnh đây là **đích đến sau 12 tuần**, không phải task hằng ngày.
- Làm rõ Step 4: sau khi lưu sẽ sang `weekly execution/Hôm nay`, và điểm thực thi là điểm theo dõi việc lặp lại, không phải điểm chung chung.

#### P1

- Đổi ngôn ngữ Step 2 và Step 3 sang lời đời thường hơn cho persona phổ thông: “việc lặp lại”, “ngày review tuần”, “thời lượng mỗi ngày”, “khối lượng tuần đầu”.
- Thêm ví dụ ngắn theo bối cảnh sức khỏe / học tập / project ngay dưới field chính để giảm hiểu nhầm.

#### P2

- Giảm độ nặng của preview Step 4 bằng cách nhóm các card theo thứ tự ưu tiên rõ hơn.
- Tinh gọn các khối giải thích phụ trong Step 2 và Step 3 để user mới không phải đọc quá nhiều trước khi nhập dữ liệu.
- Cân nhắc thêm một dòng “Bạn sẽ lưu gì?” ngay trước nút `Lưu kế hoạch`.

## 8. Notes

- Report này là simulated research, không thay thế test với người dùng thật.
- Không có thay đổi code trong task này theo yêu cầu.
- Nguồn tham chiếu chính: [`docs/ux/12-week-setup-lab-user-test-plan.md`](docs/ux/12-week-setup-lab-user-test-plan.md), [`src/features/plan12week/pages/12WeekSetupLab.tsx`](src/features/plan12week/pages/12WeekSetupLab.tsx), [`src/features/plan12week/pages/12WeekSetup/components/OutcomeStepLab.tsx`](src/features/plan12week/pages/12WeekSetup/components/OutcomeStepLab.tsx), [`src/features/plan12week/pages/12WeekSetup/components/LeadIndicatorsStepLab.tsx`](src/features/plan12week/pages/12WeekSetup/components/LeadIndicatorsStepLab.tsx), [`src/features/plan12week/pages/12WeekSetup/components/ScheduleStepLab.tsx`](src/features/plan12week/pages/12WeekSetup/components/ScheduleStepLab.tsx), [`src/features/plan12week/components/PlanPreviewLab.tsx`](src/features/plan12week/components/PlanPreviewLab.tsx).
