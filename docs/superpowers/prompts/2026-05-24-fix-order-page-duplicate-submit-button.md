# Fix `OrderPage.test.tsx` — 2 button match `/Đặt đơn/` regex

> Pre-existing test fail trên main, phát hiện khi verify PR #47 (P2 polish copy).
> Không liên quan PR P2. Cần fix riêng để CI frontend xanh.

---

## Triệu chứng

```
FAIL  src/features/order/pages/OrderPage.test.tsx > OrderPage >
  submits with itemIds[] (no priceVnd) and saves localStorage

TestingLibraryElementError: Found multiple elements with the role "button"
and name `/Đặt đơn/`
```

Test fail ở line 62 của file test:

```ts
fireEvent.click(screen.getByRole("button", { name: /Đặt đơn/ }));
```

## Root cause

Có **2 button** render đồng thời cùng match `/Đặt đơn/`:

1. `src/features/order/components/OrderSummary.tsx:167` — `"Đặt đơn — {price}"` (sticky summary card)
2. `src/features/order/pages/OrderPage.tsx:361` — `"Đặt đơn"` (mobile sticky bar bottom)

UI cố ý có 2 button (desktop dùng OrderSummary, mobile dùng bottom bar). Source code đúng, **chỉ test cần update**.

Có thể commit gây ra: `0aa88156` "feat(order): restructure page with hero + progress bar + step cards" đã thêm sticky bar bottom.

## Phạm vi

**Chỉ sửa 1 file**: `src/features/order/pages/OrderPage.test.tsx`.

Không động vào source code OrderPage/OrderSummary.

## Branch

```bash
git checkout main
git pull origin main
git checkout -b fix/order-page-duplicate-submit-button-test
```

## Fix

Đổi 1 dòng:

```ts
// Before
fireEvent.click(screen.getByRole("button", { name: /Đặt đơn/ }));

// After (option 1 — target sticky bar bottom, vì đó là button mobile primary)
fireEvent.click(screen.getByRole("button", { name: /^Đặt đơn$/ }));

// Option 2 — target OrderSummary có price (desktop)
fireEvent.click(screen.getByRole("button", { name: /Đặt đơn —/ }));

// Option 3 — dùng getAllByRole và chọn enabled button đầu tiên
const submitButtons = screen.getAllByRole("button", { name: /Đặt đơn/ });
fireEvent.click(submitButtons[0]);
```

**Recommend option 1** vì:
- Regex anchor `^...$` đảm bảo match đúng button có text "Đặt đơn" thôi.
- OrderPage sticky bar bottom là button user click trên mobile — đại diện cho production use case.
- Đơn giản, không cần refactor test logic.

## Verify

```bash
npx vitest run src/features/order/pages/OrderPage.test.tsx
```

Expect: 7 tests pass (hoặc bao nhiêu cũng pass, không có fail).

Sau đó chạy full để chắc không regression chỗ khác:

```bash
npm run test:run
```

## Commit

```bash
git add src/features/order/pages/OrderPage.test.tsx
git commit -m "test(order): disambiguate Đặt đơn button selector

OrderPage renders two buttons matching /Đặt đơn/:
- OrderSummary sticky card: 'Đặt đơn — {price}'
- OrderPage sticky bar bottom: 'Đặt đơn'

Original test used getByRole with broad regex /Đặt đơn/ → multi-match
error. Anchor regex to exact 'Đặt đơn' so test targets the bottom
sticky bar (mobile primary CTA) consistently.

No source code changes. Pre-existing fail on main, surfaced during
P2 polish copy CI run."
```

## Push + PR

```bash
git push origin fix/order-page-duplicate-submit-button-test

gh pr create --title "Fix OrderPage.test 'Đặt đơn' selector ambiguity" --body "$(cat <<'EOF'
## Summary
- OrderPage có 2 button text 'Đặt đơn' (OrderSummary + bottom sticky bar).
- Test cũ dùng regex broad → multi-match.
- Anchor regex để target chính xác button bottom.

## Test plan
- [x] npx vitest run OrderPage.test.tsx → pass
- [ ] npm run test:run → full suite pass
- [ ] CI check pass trước khi merge

🤖 Generated với Claude Code
EOF
)"
```

## Báo cáo cuối

- Hash commit + URL PR.
- Output `npx vitest run OrderPage.test.tsx` (summary).
- Output `npm run test:run` (summary).

## Quy tắc

- KHÔNG sửa source OrderPage / OrderSummary.
- KHÔNG merge PR tự động.
- Trả lời tiếng Việt.

Bắt đầu.
