# Vision Board Web Platform

Vision Board Web Platform là một web app local-first cho flow:

- đánh giá "wheel of life"
- rút ra life insight
- tạo SMART goal
- kiểm tra feasibility
- vận hành chu kỳ 12 tuần
- lưu vision board, journal, achievements và billing state

Frontend chạy bằng React + Vite + TypeScript. Backend là Express + MongoDB + Firebase Auth, hiện được dùng chủ yếu để đồng bộ plan/task/week/metric cho flow 12 tuần.

## Kiến trúc nhanh

- `./`: frontend React/Vite
- `./backend`: API Express/Mongo/Firebase
- `localStorage`: source of truth chính cho dữ liệu local-first
- `guidelines/`: ghi chú deploy và vận hành

Nếu bạn chỉ muốn xem UI và nghiệp vụ, có thể chạy frontend ở `demo mode` mà không cần backend.

## Yêu cầu môi trường

- Node.js `20.x`
- npm
- MongoDB Atlas chỉ cần khi muốn chạy backend thật
- Firebase client + Firebase service account chỉ cần khi muốn auth và sync API thật

## Cách 1: Chạy nhanh frontend demo

Đây là cách để xem app nhanh nhất.

### 1. Cài dependencies frontend

```powershell
npm install
```

### 2. Tạo file env frontend

```powershell
Copy-Item .env.example .env
```

Mặc định file `.env.example` đã phù hợp để chạy demo:

- `VITE_APP_MODE=demo`
- `VITE_BILLING_PROVIDER_MODE=mock_provider`
- `VITE_API_BASE_URL=http://localhost:4000/api`

Trong demo mode:

- app vẫn chạy được dù không bật backend
- dữ liệu được lưu local trong trình duyệt
- billing flow dùng mock checkout
- Firebase có thể để trống

### 3. Chạy frontend

```powershell
npm run dev
```

Mở:

```text
http://localhost:5173
```

## Cách 2: Chạy full stack local

Sử dụng cách này nếu bạn muốn:

- test sync 12-week plan với backend
- dùng Firebase Auth thật
- dùng MongoDB thật

### Bước 1. Cài dependencies cho cả 2 phần

Frontend:

```powershell
npm install
```

Backend:

```powershell
cd backend
npm install
cd ..
```

### Bước 2. Cấu hình env frontend

Tạo file `.env` từ mẫu:

```powershell
Copy-Item .env.example .env
```

Khi muốn chạy full stack, nên sửa ít nhất:

```env
VITE_API_BASE_URL=http://localhost:4000/api
VITE_APP_MODE=real
VITE_BILLING_PROVIDER_MODE=mock_provider
```

Nếu muốn login và gọi API có token Firebase, điền thêm đầy đủ:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_MEASUREMENT_ID=
```

Lưu ý:

- Nếu không điền `VITE_FIREBASE_*`, UI vẫn mở được, nhưng các API cần auth sẽ không có token hợp lệ.
- Backend gần như tất cả route đều yêu cầu Firebase ID token, trừ `GET /api/health`.

### Bước 3. Cấu hình env backend

Tạo file `backend/.env`:

```powershell
Copy-Item backend/.env.example backend/.env
```

Giá trị bắt buộc trong `backend/.env`:

```env
PORT=4000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/vision_board
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
FRONTEND_ORIGIN=http://localhost:5173
```

Lưu ý cho `FIREBASE_PRIVATE_KEY`:

- giữ nguyên dấu ngoặc kép
- giữ `\n` trong file env, backend sẽ tự convert thành xuống dòng thật

### Bước 4. Chạy backend

Mở terminal 1:

```powershell
cd backend
npm run dev
```

Kiểm tra health:

```text
http://localhost:4000/api/health
```

### Bước 5. Chạy frontend

Mở terminal 2:

```powershell
npm run dev
```

Frontend:

```text
http://localhost:5173
```

## Scripts hay dùng

### Frontend

```powershell
npm run dev
npm run build
npm run typecheck
npm run lint
npm run test:run
npm run check
```

Ý nghĩa:

- `dev`: chạy Vite dev server
- `build`: build frontend production
- `typecheck`: chạy TypeScript check
- `lint`: chạy Biome lint
- `test:run`: chạy Vitest 1 lần
- `check`: typecheck + lint + test + build

### Backend

```powershell
cd backend
npm run dev
npm run build
npm run start
```

Ý nghĩa:

- `dev`: chạy backend bằng `ts-node-dev`
- `build`: compile TypeScript vào `backend/dist`
- `start`: chạy bản build production

## Dữ liệu trong dự án đang hoạt động thế nào

Đây là điểm quan trọng nếu bạn debug:

- app hiện tại là `local-first`
- goals, vision boards, reflections, achievements, subscription state và nhiều dữ liệu UI được lưu trong `localStorage`
- backend hiện được nối chủ yếu cho domain `plan / week / task / metric`
- nếu backend lỗi, frontend vẫn có thể tiếp tục chạy được phần lớn nghiệp vụ local

Vì vậy:

- debug giao diện và nghiệp vụ có thể bắt đầu từ frontend
- debug sync thì cần xem cả `.env`, Firebase token và backend logs

## Billing và thanh toán

App hiện có 3 chế độ billing:

- `local_test`
- `mock_provider`
- `api_contract`

Trong local dev, khuyến nghị:

- dùng `mock_provider` để test flow paywall và checkout mà không cần provider thật

Biến liên quan nằm trong `.env.example`:

- `VITE_BILLING_PROVIDER_MODE`
- `VITE_BILLING_PROVIDER_LABEL`
- `VITE_BILLING_API_BASE`
- `VITE_BILLING_CHECKOUT_ENDPOINT`
- `VITE_BILLING_PORTAL_ENDPOINT`
- `VITE_BILLING_RESTORE_ENDPOINT`
- `VITE_BILLING_ENTITLEMENT_SYNC_ENDPOINT`

## Deploy

- Frontend env template: `./.env.example`
- Backend env template: `./backend/.env.example`
- Frontend deploy notes: `./guidelines/VercelDeploymentChecklist.md`
- Backend deploy notes: `./backend/README.md`
- Backend Render blueprint: `./render.yaml`

## Nếu chạy lỗi, xem nhanh các điểm này

### Frontend mở được nhưng sync lỗi

Kiểm tra:

- backend đã chạy chưa
- `VITE_API_BASE_URL` có đúng `http://localhost:4000/api` không
- frontend đã đăng nhập Firebase chưa
- backend có đủ `FIREBASE_*` và `MONGODB_URI` chưa

### API bị 401

Thường là:

- frontend chưa có Firebase token
- `VITE_FIREBASE_*` chưa khai báo
- backend đang dùng Firebase project khác với frontend

### Chỉ muốn xem app cho nhanh

Dùng:

- `VITE_APP_MODE=demo`
- `VITE_BILLING_PROVIDER_MODE=mock_provider`

và chỉ cần:

```powershell
npm install
npm run dev
```
