# P2 — Polish copy + messaging "sản phẩm đã ready cho user"

> Tiếp theo của P1. **Tiền đề**: sản phẩm đã production, user thật có thể đăng ký dùng — demo trước lớp là để show **sản phẩm thật** chứ không phải prototype.
> Mục tiêu P2: rà soát copy ở các trang user thấy đầu tiên + paywall + footer, đảm bảo messaging phản ánh đúng "đây là sản phẩm thật, không phải demo".

---

## Bối cảnh

- Repo root: `C:\Users\admin\Downloads\Vision Board Web Platform\`
- URL production: https://dearourfuture.io.vn/
- Đọc trước: `CLAUDE.md`, output P1 nếu đã có (`qa-artifacts/p1-audit/REPORT.md`).
- Tuân thủ phong cách viết tự nhiên, calm, serif headings, không marketing-y.

## Phạm vi

**Chỉ sửa text copy, KHÔNG đổi logic, KHÔNG đổi route, KHÔNG đổi style.**

File được phép chạm:
- `src/features/dashboard/v2/PublicVisitorView.tsx` (đã polish lần 1, lần này tinh chỉnh)
- `src/app/pages/BillingPlan.tsx` (verify copy production-ready)
- `src/app/pages/LoginPage.tsx` (verify copy đăng ký không gây hiểu nhầm)
- `src/app/components/Footer*.tsx` (nếu có)
- `src/app/components/root-layout/*` (nếu copy ở đây)
- `index.html` (meta description nếu cần)

Không chạm: routes.tsx, storage, billing logic, auth logic.

## Branch

Tạo branch riêng để tách khỏi work khác:

```bash
git checkout main
git pull origin main
git checkout -b polish/demo-ready-copy
```

## Phase 2.1 — PublicVisitorView final touch

Đọc `src/features/dashboard/v2/PublicVisitorView.tsx` (sau commit cd14fb4a). Heading hiện tại:

> "Biến mục tiêu mơ hồ thành kế hoạch 12 tuần và việc làm mỗi ngày."

### Thay đổi cần làm

1. **Section 3 chip trust** — thay "Local-first, không cần đăng nhập để xem" thành "Mở trang là dùng được, không cần email" (giữ tinh thần local-first nhưng dễ hiểu hơn). Giữ 2 chip còn lại.
2. **Section CTA cuối** ("Sẵn sàng dựng chu kỳ 12 tuần đầu tiên?"):
   - Sub-text hiện tại: "Tạo tài khoản hoặc đăng nhập để mở không gian 12 tuần và đồng bộ giữa các thiết bị."
   - Đổi thành: "Đăng ký miễn phí trong 30 giây. Dữ liệu của bạn tự đồng bộ giữa điện thoại và máy tính."
   - Button label nếu là "Bắt đầu demo" → đổi thành "Đăng ký miễn phí".
   - Button label nếu là "Đăng nhập để bắt đầu" → giữ nguyên.
3. **3 card "Vì sao chọn"** — review lại:
   - Card 1 "Local-first" — đổi tag thành "Miễn phí" và title thành "Bắt đầu không tốn xu nào", description giữ ý "dữ liệu lưu trên thiết bị, đồng bộ khi đăng nhập".
   - Card 2 "Đúng thứ tự" — giữ nguyên (vẫn relevant).
   - Card 3 "Mobile-ready" — giữ nguyên.

### Verify

```bash
npm run typecheck
npm run lint
```

## Phase 2.2 — BillingPlan copy production-ready

Đọc `src/app/pages/BillingPlan.tsx`. Section "Tin cậy khi thanh toán" hiện đang show copy chuyển khoản thật ("Biên nhận điện tử qua email", "support@dearourfuture.com"...).

### Cần làm

Vì sản phẩm đã production, copy này HỢP LÝ và GIỮ NGUYÊN. Chỉ kiểm tra:

1. Email support `support@dearourfuture.com` có inbox đang được monitor không. Nếu chưa, **báo cáo lại cho user** — không tự đổi.
2. Link "Chính sách hoàn tiền" (footer hoặc trong page) phải dẫn đến trang `/refund-policy` đang sống.
3. Plan price ("99.000đ / tháng") khớp với env var `VITE_BILLING_PLUS_MONTHLY_PRICE_VND` trong `.env.production`.
4. Nút "Nâng cấp Plus" có disabled state khi user chưa login? Test bằng cách logout rồi vào `/billing/plan`. Nếu nút active mà flow checkout fail vì chưa login, **đó là bug** → báo cáo, không tự fix.

### Verify

```bash
npm run typecheck
npm run lint
```

## Phase 2.3 — LoginPage copy

Đọc `src/app/pages/LoginPage.tsx`. Kiểm tra:

1. Tagline trang sign-up có dòng "Khoảng 30 giây" — giữ nguyên (chính xác).
2. Disclaimer Firebase ("Nếu trước đây bạn đăng nhập bằng Google, hãy dùng button trên thay vì email/mật khẩu.") — giữ nguyên.
3. Quote Jim Rohn ở sidebar — giữ nguyên.

Nếu copy nào dùng từ "demo" hay "thử nghiệm" không phù hợp với sản phẩm production, đổi thành ngôn ngữ phù hợp. **Đừng đổi vô tội vạ** — chỉ đổi chỗ nào đang gây hiểu nhầm.

## Phase 2.4 — Footer + meta

1. File `index.html` line 21:
   ```
   <meta name="description" content="Dear Our Future - Lập kế hoạch mục tiêu 12 tuần, theo dõi tiến độ và sống có chủ đích hơn mỗi ngày." />
   ```
   Giữ nguyên — chính xác.

2. Footer copy (tìm trong `src/app/components/root-layout/Footer.tsx` hoặc tương tự):
   - "© 2026 Dear Our Future. Made with ❤️ tình yêu ở Việt Nam." — giữ nguyên hoặc bỏ "tình yêu" nếu thừa.
   - "Local-first · Hoạt động trên mọi thiết bị" — giữ nguyên.

3. Sidebar trong Workspace có dòng "12-tuần · Vision" dưới tên Dear Our Future. Đây là tagline OK.

## Phase 2.5 — Verify + screenshot

Khởi động dev server (đảm bảo demo mode):

```bash
# Tạo .env.development.local nếu chưa có (đừng commit)
# VITE_APP_MODE=demo
# VITE_BILLING_PROVIDER_MODE=mock_provider
# VITE_ANALYTICS_MODE=off
npm run dev
```

Dùng Playwright MCP chụp 3 trang ở 3 viewport (1280/768/375):

- `/` (PublicVisitorView)
- `/billing/plan`
- `/login?mode=signup`

Lưu vào `qa-artifacts/p2-polish/{viewport}-{page}.png`. Verify không có copy nào nói "demo" ở public-facing pages.

## Phase 2.6 — Commit + PR

```bash
git add src/features/dashboard/v2/PublicVisitorView.tsx
# Add các file khác đã sửa
git status  # review
git commit -m "polish(copy): refine public-facing copy for production demo

- PublicVisitorView CTA, trust chips, why-choose cards
- Verify BillingPlan + LoginPage copy is production-ready
- No logic changes"

git push origin polish/demo-ready-copy
```

Sau đó tạo PR (nếu có GitHub CLI):

```bash
gh pr create --title "Polish copy cho demo trước lớp" --body "$(cat <<'EOF'
## Summary
- PublicVisitorView final touch (3 chip, CTA cuối, 3 card why-choose)
- Verify BillingPlan copy production-ready (không thay đổi vì sản phẩm đã production)
- Verify LoginPage copy không có ngôn ngữ "demo/prototype"
- No logic changes

## Test plan
- [ ] typecheck pass
- [ ] lint pass
- [ ] PublicVisitorView render đúng ở 1280/768/375
- [ ] BillingPlan render đúng
- [ ] No regression ở LoginPage

🤖 Generated với Claude Code
EOF
)"
```

## Báo cáo cuối P2

- Hash commit.
- URL PR (nếu có).
- Output `npm run typecheck && npm run lint`.
- Screenshot path.
- Note: có item nào chuyển sang follow-up không (vd email support chưa monitor).

## Quy tắc khi làm

- Tuân thủ `CLAUDE.md`.
- Dùng `Edit` tool, KHÔNG dùng `cat >` hay `Set-Content`.
- KHÔNG đổi logic, KHÔNG đổi style classes.
- KHÔNG merge PR — để user tự duyệt.
- Trả lời bằng tiếng Việt.

Bắt đầu Phase 2.1.
