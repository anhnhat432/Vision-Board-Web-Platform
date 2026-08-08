# Daily Home V2 - Action First Dashboard Design

- Ngay: 2026-08-08
- Trang thai: Cho nguoi dung ra soat ban spec chi tiet
- Phan loai: Mixed, Hybrid SDD/ADD
- Do sau: Standard
- Route: `/`
- Base SHA: `4712893829c519ccfcdf5c1d6378595a82e3cb29`

## 1. Boi canh va muc tieu

`/` hien la Home cho nguoi dung da dang nhap, nhung thu tu noi dung dang uu tien tong quan va dong luc truoc hanh dong can lam ngay. Voi nguoi dung da co active 12-week system, Dashboard hien render hero lon, guide, rescue/plan notice, sau do moi toi Today preview. Today preview chi hien task va yeu cau nguoi dung mo workspace `/12-week-system?tab=today` de complete.

Daily Home V2 doi vai tro Home tu dashboard "xem thong tin" thanh mot thin composition phuc vu van hanh hang ngay. Trong khoang 5 giay sau khi mo `/`, nguoi dung phai biet:

1. Viec quan trong nhat hom nay la gi.
2. Viec do thuoc muc tieu nao.
3. Hom nay da hoan thanh bao nhieu viec.
4. Dang o tuan nao trong chu ky 12 tuan.
5. Co canh bao that hoac review den han nao can chu y.

Muc tieu thanh cong chinh la **action first**: primary task va primary completion action xuat hien truoc guide, quote, active goals, analytics va cac module phu.

## 2. Quyet dinh delivery

### 2.1 Core va Shell

| Nhom | Pham vi | Ly do |
| --- | --- | --- |
| Core | Canonical task completion, local-first state, structured mutation result, overdue semantics, cross-tab/storage refresh | Sai contract co the tao mutation path thu ba, state stale hoac canh bao sai. |
| Shell | Compact hero, action-first hierarchy, daily queue preview, weekly pulse, disclosure cho secondary modules, responsive presentation | De rollback, co the kiem chung bang focused tests va browser QA. |

### 2.2 Phuong an duoc chon

Chon **Focus + preview queue**:

- Home chi co mot completion action truc tiep cho primary task.
- Daily queue ben duoi la preview cua cac task con lai va khong lap primary task.
- Secondary task khong complete truc tiep tren Home trong pham vi nay; nguoi dung mo Today workspace de quan ly day du queue, reschedule va recovery action.
- Week context la factual pulse ngan, khong invent "on track" status.
- Review due va overdue la contextual attention, khong tranh visual weight voi primary task khi van con daily task.

Phuong an nay phu hop code hien tai vi `TodayMiniCard` da la preview-only, con canonical completion da co contract rieng. No giam rui ro duplicate affordance va giu `/12-week-system` la workspace chuyen sau.

### 2.3 Phuong an khong chon

- **Interactive secondary queue:** cho moi secondary task complete tren Home. UX nhanh hon cho task bat ky, nhung tao nhieu completion affordance, tang optimistic-state complexity va mo rong test surface.
- **Embed Today workspace:** tai su dung nhieu UI hien co, nhung dua check-in, rescue, reschedule va support controls len Home; trai voi thin composition va lam daily route nang hon.

## 3. Pham vi

### 3.1 Trong pham vi

- Thay doi hierarchy cua signed-in Dashboard khi co active 12-week system.
- Thu gon `DashboardHero` thanh identity/week context.
- Them primary focus card co canonical completion.
- Bien Today preview thanh queue con lai, khong lap primary task.
- Them weekly pulse ngan va factual warning.
- Sua `missedTasksCount` tren Dashboard dung overdue that.
- Xu ly no-task, all-done va review-due states.
- Giu cross-tab, same-tab storage event va cloud-applied refresh.
- Them focused component/integration tests va responsive browser QA.

### 3.2 Ngoai pham vi

- Khong tao route moi hoac redirect `/`.
- Khong doi backend, API contract, database, auth, billing hoac sync protocol.
- Khong doi localStorage key/shape, migration hoac normalization.
- Khong redesign AI, pet, gamification, Weekly Insights hoac toan bo app.
- Khong them dependency, font, chart library, polling hoac API fetch.
- Khong thay doi internals canonical completion tru khi co bug blocking duoc chung minh bang test.

## 4. Information hierarchy

### 4.1 Desktop 1440x900

```text
Compact context: Chao [name] · Tuan 4/12 · sync/local state
-----------------------------------------------------------
PRIMARY FOCUS                               WEEKLY PULSE
VIEC QUAN TRONG NHAT HOM NAY                6/9 · 67%
[Task title]                                [overdue that]
Muc tieu: [goal title]                      [review due context]
[ Danh dau xong ]
-----------------------------------------------------------
HOM NAY · 2/4
[remaining task]
[remaining task]
[ Mo Today workspace ]
-----------------------------------------------------------
Check-in / review handoff
-----------------------------------------------------------
Muc tieu va Phan tich & nhip do trong secondary region
```

Primary focus phai nam trong normal first viewport va dung truoc moi secondary Dashboard heading trong DOM order.

### 4.2 Mobile 390x844

```text
Chao [name] · Tuan 4/12 · sync
--------------------------------
VIEC QUAN TRONG NHAT HOM NAY
[Task title wraps]
Muc tieu: [goal]
[ Danh dau xong - full width ]
--------------------------------
HOM NAY · 2/4
[remaining task]
[remaining task]
--------------------------------
TUAN NAY · 6/9 · 67%
--------------------------------
Review/check-in contextual
--------------------------------
Secondary disclosure
```

Primary CTA co touch target toi thieu 44px, khong horizontal overflow va khong bi sticky feedback/mobile navigation che.

## 5. Ngon ngu thi giac

Daily Home V2 giu design system hien co, khong tao theme moi:

- Canvas: `--app-bg` / `#F2EFE6`.
- Surface: `--app-surface` va `--app-bg-subtle` / `#FAF8F3`.
- Ink: `--app-ink` / `#17150F` va `--app-ink-soft` / `#5C574B`.
- Primary forest: `--app-accent` / `#0C5E3A`.
- Soft forest: `--app-accent-soft` / `#E4EEDF`.
- Energy/warning chi dung cho attention that: `--app-energy` / `#FF5C3E` va existing warm/status tokens.

Typography tiep tuc dung `Source Serif 4` cho task title/heading trong tam va `Be Vietnam Pro` cho body/control. Khong them font package.

Signature visual la **Focus Runway**: mot surface primary rong, co accent rail mong va mot CTA ro rang; moi module xung quanh giam shadow, saturation va CTA weight. Motion chi dung fade/translate ngan va feedback nhe sau completion; `prefers-reduced-motion` duoc ton trong.

## 6. Component architecture

### 6.1 `Dashboard.tsx`

`Dashboard.tsx` tiep tuc orchestration route va signed-in/fresh/public branching. Phan active-system tro thanh thin composition:

- Nhan shared daily execution snapshot tu system hien tai.
- So huu completion handler goi canonical contract.
- Phan phoi state/handler cho presentation components.
- Giu guide, rescue, goals va analytics accessible nhung sau daily execution.

Khong refactor toan bo file; chi extract nhung component co mot product responsibility ro rang.

### 6.2 `DashboardHero`

Chuyen tu large motivational hero + featured goal card thanh compact context strip:

- Greeting/display name.
- `Tuan n/12`.
- Local/sync context hien co neu co source dang tin cay.
- Khong quote, anh vision board hoac CTA co cung visual weight voi primary completion.

Quote va goal-management content chuyen vao secondary region hien co.

### 6.3 `DailyFocusCard`

Component moi chiu trach nhiem duy nhat cho primary daily action:

- Hien task title, goal title va contextual overdue badge neu task that su overdue.
- Hien dung mot semantic button `Danh dau xong`.
- Accessible name bao gom task title.
- Trong luc xu ly, button disabled/`aria-busy` de ngan double click.
- Khong chua reschedule, skip, confetti, sound hoac secondary completion controls.

### 6.4 `TodayMiniCard`

Tiep tuc vai tro preview queue, nhung nhan danh sach da loai primary task:

- Heading `Hom nay` va factual count `completed/total`.
- Hien toi da ba remaining task rows, khong co checkbox/button completion.
- Link ro rang toi `/12-week-system?tab=today`.
- Khong fallback sang task tuan neu hom nay khong co task; no-task la mot state ro rang, khong fake Today.

### 6.5 `WeeklyPulseCard`

Component moi chi hien context toi thieu:

- `Tuan n/12`.
- `completed/total` va percent cua tuan hien tai.
- `overdueOpenCount` neu lon hon 0.
- Review due contextual neu phu hop.

Khong hien chart, streak, invented status hoac multi-metric dashboard.

### 6.6 Secondary content

- Active goals, week rhythm, trend, balance, stoic va quote van reachable.
- Guide khong xoa, nhung returning active user khong bi guide day primary task khoi first viewport.
- Existing `Phan tich & nhip do` disclosure tiep tuc chua analytics/secondary insight.

## 7. Data derivation contract

Dashboard khong tiep tuc tu tao lai cac phep tinh ngay/tuan da co trong storage helpers. Shared Home derivation phai cung cap:

```text
scheduledTodayTasks
openScheduledTodayTasks
todayCompletedCount
todayRemainingCount
overdueOpenCount
homePrimaryTask
homeSecondaryTasks
reviewDueToday
weekCompletion
```

Semantics cua Home:

- `scheduledTodayTasks` chi gom task co `scheduledDate` la ngay hien tai va khong skipped.
- `homePrimaryTask` la open scheduled-today task dau tien.
- `homeSecondaryTasks` la open scheduled-today tasks sau primary.
- `overdueOpenCount` chi dem open tasks co `scheduledDate < today` trong current week.
- Completed task khong con la primary hero.
- Overdue va task tuan khong duoc fallback thanh task "hom nay". Chúng chi xuat hien nhu factual warning hoac workspace handoff.

Today workspace co the tiep tuc queue contract rong hon hien tai, gom missed/completed-today/fallback tasks. Daily Home V2 khong doi contract do. Neu can extract helper, helper chi chia se raw date/week derivation; phai pure, khong doc/ghi storage va co focused unit tests.

## 8. Canonical completion flow

```text
Home primary button
    -> commitTwelveWeekTaskCompletion({ goalId, taskId, completed: true })
    -> local UserData + scoreboard saved
    -> task_completed_changed mutation queued
    -> existing USER_DATA_UPDATED event reloads Dashboard
    -> existing auto sync/drain handles remote continuity
```

Dashboard khong goi `updateGoal`, `toggleTwelveWeekTask` hoac `saveUserData` cho completion. Dashboard khong goi plan-detail refresh sau click.

Structured result:

| Result | UI behavior |
| --- | --- |
| `applied` | Disable duplicate click, refresh local snapshot, show concise success feedback, advance to next primary task hoac closure state. |
| `noop` | Reload current local truth; khong show false success hoac enqueue them mutation. |
| `not_found` | Reload current local truth va show concise error/actionable feedback. |
| `local_save_failed` | Giu task chua complete tren UI, re-enable action va show error. |

Backend overlay khong duoc ghi de task vua local-update; existing `lastModifiedAt` local-wins guard duoc giu nguyen. Khong them request de "xac nhan" completion.

## 9. State behavior

### 9.1 Active task

- Primary focus hien open task dau tien.
- Queue chi hien remaining tasks sau primary.
- Review due va overdue nam trong contextual pulse/attention, khong thay primary task.

### 9.2 Sau completion

- Count hom nay, week progress va goal progress neu dang hien phai cap nhat tu local truth.
- Task tiep theo tro thanh primary.
- Primary task cu khong con mot completion action tren man.

### 9.3 All done

- Khong render completed task lam hero.
- Hien closure `Hom nay da hoan thanh X/X`.
- Neu review den han, `Review tuan` co the tro thanh next primary action.
- Neu review chua den han, handoff toi check-in hoac xem tuan la secondary action duy nhat.

### 9.4 No tasks today

- Hien `Hom nay khong co viec duoc len lich`.
- Khong fallback queue copy thanh "Viec hom nay" bang task tuan.
- Cung cap relevant next action nhu xem tuan hoac mo Today workspace.

### 9.5 No goal va no system

- Fresh/no-goal flow tiep tuc dung `NewUserSetupView` va CTA tao muc tieu dau tien.
- Goal khong co 12-week system tiep tuc CTA setup plan.
- Khong render fake daily focus.

### 9.6 Review due

- Khi con daily task, review CTA nam sau daily execution.
- Khi khong con daily task, review co the la next primary action.

### 9.7 Cross-tab va sync-applied state

Dashboard tiep tuc lang nghe:

- same-tab `USER_DATA_UPDATED_EVENT_NAME`;
- cross-tab `storage`;
- window focus va visibility;
- cloud sync ghi vao local UserData.

Presentation components khong giu ban sao task list doc lap lau dai.

## 10. Functional requirements (EARS)

- **DHV2-001:** **WHEN** signed-in user co active 12-week system mo `/`, **THE system SHALL** render primary daily action truoc guide, active goals va secondary analytics trong DOM order.
- **DHV2-002:** **WHERE** desktop viewport la `1440x900`, **THE system SHALL** hien primary task va completion action trong first viewport khong can scroll trong normal signed-in state.
- **DHV2-003:** **WHERE** mobile viewport la `390x844`, **THE system SHALL** dat primary task gan dau viewport, giu CTA toi thieu 44px va khong tao horizontal overflow.
- **DHV2-004:** **WHEN** primary task con open, **THE system SHALL** hien dung mot primary completion action cho task do tren Home.
- **DHV2-005:** **WHEN** user complete primary task, **THE system SHALL** goi `commitTwelveWeekTaskCompletion()` va khong goi direct storage/goal completion path khac.
- **DHV2-006:** **WHEN** canonical result la `applied`, **THE system SHALL** cap nhat local UI ma khong cho REST/network response va khong fetch plan detail ngay.
- **DHV2-007:** **WHEN** canonical result la `noop`, `not_found` hoac `local_save_failed`, **THE system SHALL** reconcile UI voi local truth va khong hien success sai.
- **DHV2-008:** **WHEN** task A duoc complete va task B con open, **THE system SHALL** chuyen task B thanh primary action.
- **DHV2-009:** **WHEN** task cuoi cung hom nay duoc complete, **THE system SHALL** hien closure state thay vi completed-task hero.
- **DHV2-010:** **WHEN** primary task render trong focus card, **THE system SHALL** loai task do khoi remaining queue va khong tao completion affordance thu hai.
- **DHV2-011:** **WHEN** co ba task hom nay chua complete nhung `overdueOpenCount` bang 0, **THE system SHALL NOT** hien `3 viec dang tre`.
- **DHV2-012:** **WHEN** `overdueOpenCount` lon hon 0, **THE system SHALL** hien factual overdue warning tu source do.
- **DHV2-013:** **WHEN** `reviewDueToday` true va van con daily task, **THE system SHALL** hien review nhu contextual handoff sau daily execution.
- **DHV2-014:** **WHEN** `reviewDueToday` true va khong con daily task, **THE system SHALL** cho phep review tro thanh next primary action.
- **DHV2-015:** **WHEN** active system khong co task hom nay, **THE system SHALL** hien no-task state va khong fake task hero.
- **DHV2-016:** **WHEN** storage thay doi tu Today, GoalTracker, browser tab khac hoac cloud apply, **THE system SHALL** refresh Home tu shared local truth.
- **DHV2-017:** **WHEN** keyboard user focus primary completion action, **THE system SHALL** co semantic button, accessible name du context va visible focus indicator.
- **DHV2-018:** **WHERE** `prefers-reduced-motion: reduce`, **THE system SHALL** giu completion feedback va hierarchy ma khong phu thuoc animation.
- **DHV2-019:** **WHILE** Dashboard mount hoac completion, **THE system SHALL NOT** them polling, analytics library, chart library hoac API request moi.

## 11. Test strategy

### 11.1 Pure derivation tests

- Scheduled-today primary/secondary split giu dung thu tu va khong duplicate.
- Completed task khong thanh primary.
- `overdueOpenCount` phan biet task truoc hom nay va task hom nay chua xong.
- Task tuan chua den lich khong fallback thanh Home primary task.
- All-done, no-today-task va review-due state.

### 11.2 Dashboard integration tests

- Primary focus dung truoc secondary headings.
- Click primary completion tao canonical `task_completed_changed` pending mutation.
- Sau task A, task B tro thanh primary.
- Sau task cuoi, closure state render.
- Queue khong co primary completion action thu hai.
- `3 unfinished today + 0 overdue` khong render overdue pile.
- Review CTA contextual.
- No today task va no 12-week system giu state/CTA dung.
- Same-tab custom event va cross-tab storage event refresh Dashboard.
- Public/fresh-state Dashboard tests tiep tuc green.

Canonical module internals khong bi mock qua cao; integration test phai quan sat UserData/outbox effect that. API/network khong nam trong test completion Home.

### 11.3 Accessibility va responsive

- Mot logical `h1`; section headings theo DOM order.
- Primary button keyboard-operable, accessible name co task title, disabled khi dang commit.
- Completed/overdue state khong chi phan biet bang mau.
- Browser QA desktop `1440x900` va mobile `390x844` cho active task, next task, all done, no task, review due va overdue.

## 12. Verification gate

L1 automated:

```bash
npm run typecheck
npm run lint
npm run test:run
npm run test:ui
npm run test:sync
npm run test:ops
npm run build
```

L2 spec compliance:

- Trace tung `DHV2-*` toi test hoac browser evidence.
- Search diff khong co direct Dashboard completion bang `updateGoal`, `toggleTwelveWeekTask` hoac `saveUserData`.

L3 constitution/safety:

- Khong backend/auth/billing/sync protocol/localStorage schema change.
- Khong dependency hoac secret.
- Local-first va app-mode behavior giu nguyen.

L4 acceptance:

- Manual flow tren desktop/mobile chung minh primary action above fold, no duplicate, next-task/all-done transition, overdue semantics va secondary content reachable.

## 13. Rui ro va giam thieu

| Rui ro | Giam thieu |
| --- | --- |
| Backend overlay stale lam task vua complete bi giat lai | Giu `lastModifiedAt` local-wins guard; khong refresh plan detail sau click; integration test local state. |
| Double click tao duplicate mutation | Disable action trong luc commit va focused duplicate-click test. |
| Shared date/week derivation drift giua Home va Today | Reuse storage helpers va chi extract pure raw derivation; giu Home focus semantics va Today workspace queue semantics duoc test rieng. |
| Hero/guide van day primary task xuong | DOM-order test va browser first-viewport screenshot. |
| Secondary content bi mat sau redesign | Giu active goals va analytics trong explicit secondary/disclosure region, browser test reachability. |
| Baseline suite co failure unrelated | Chung minh file unchanged va, neu can, rerun cung test tren base SHA; khong sua adjacent surface ngoai scope. |

## 14. Rollout va rollback

- Mot frontend PR tren branch `feat/daily-home-v2`.
- Khong migration, feature flag hoac backend rollout.
- Rollback bang revert presentation/shared-derivation commit; UserData va pending mutation format khong thay doi.
- PR phai co focused test results, full command matrix va desktop/mobile visual proof neu local environment chay duoc.

## 15. Tieu chi hoan thanh

- `/` van la Home.
- Active-plan user thay primary task va complete truc tiep tren Home.
- Home dung canonical completion va khong tao path thu ba.
- Primary task khong duplicate; next-task va all-done state dung.
- Overdue warning chi dung overdue that.
- Week context ngan, factual; review due contextual.
- No-task/no-plan/fresh-state dung.
- Secondary Dashboard content van reachable.
- Mobile, keyboard va reduced-motion usable.
- Khong new API, dependency, backend, auth, billing, AI, pet hoac gamification expansion.
- Automated checks va manual acceptance khong co regression moi trong scope.
