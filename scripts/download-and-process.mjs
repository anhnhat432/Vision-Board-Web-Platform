import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Thư mục chứa artifacts
const artifactsDir = 'C:\\Users\\admin\\.gemini\\antigravity\\brain\\b5d278ab-b910-4368-9730-6c545ffa6187';
const outputDir = path.resolve(__dirname, '../public/curated/vision-board');

// 1. Ánh xạ các ảnh đã tạo bằng AI
const aiImagesMap = {
  'career_workspace': 'career-goc-lam-viec.webp',
  'career_deepwork': 'career-lam-viec-sau.webp',
  'career_lead': 'career-dan-dat.webp',
  'finance_budget': 'finance-ngan-sach.webp',
  'finance_abund': 'finance-du-day.webp',
  'finance_invest': 'finance-dau-tu.webp',
  'health_exercise': 'health-van-dong.webp',
  'health_medit': 'health-thien.webp',
  'health_nutri': 'health-dinh-duong.webp',
  'edu_reading': 'education-doc-sach.webp',
  'edu_group': 'education-hoc-nhom.webp',
  'edu_desk': 'education-ban-hoc.webp',
  'rel_chat': 'relationships-tro-chuyen.webp',
  'rel_comm': 'relationships-cong-dong.webp',
  'rel_support': 'relationships-nang-do.webp',
  'fam_home': 'family-to-am.webp',
};

// 2. Danh sách các ảnh Unsplash cần tải về (do quá quota sinh ảnh AI)
const unsplashImages = [
  { key: 'family-bua-toi.webp', url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1600&q=80' },
  { key: 'family-cuoi-tuan.webp', url: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=1600&q=80' },
  { key: 'growth-viet-nhat-ky.webp', url: 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=1600&q=80' },
  { key: 'growth-suy-ngam.webp', url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1600&q=80' },
  { key: 'growth-thuc-hanh.webp', url: 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=1600&q=80' },
  { key: 'leisure-du-lich.webp', url: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1600&q=80' },
  { key: 'leisure-thien-nhien.webp', url: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=1600&q=80' },
  { key: 'leisure-nghi-ngoi-sang-tao.webp', url: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=1600&q=80' },
  { key: 'binh-minh.webp', url: 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=1600&q=80' },
  { key: 'thanh-pho.webp', url: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=1600&q=80' },
  { key: 'bien.webp', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&q=80' },
  { key: 'vuon.webp', url: 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=1600&q=80' },
];

async function main() {
  console.log('--- Khởi động script xử lý ảnh ---');
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Bước 1: Xử lý các ảnh đã được tạo bằng AI
  console.log('\n--- Bước 1: Xử lý ảnh do AI sinh ra ---');
  const artifactFiles = fs.readdirSync(artifactsDir);
  
  for (const [aiPrefix, destFileName] of Object.entries(aiImagesMap)) {
    // Tìm file png trong artifacts khớp với prefix
    const matchedFile = artifactFiles.find(file => file.startsWith(aiPrefix) && file.endsWith('.png'));
    if (matchedFile) {
      const srcPath = path.join(artifactsDir, matchedFile);
      const destPath = path.join(outputDir, destFileName);
      console.log(`Đang xử lý ảnh AI: ${matchedFile} -> ${destFileName}`);
      try {
        await sharp(srcPath)
          .resize(1440, 1080, { fit: 'cover' })
          .webp({ quality: 80 })
          .toFile(destPath);
        console.log(`✅ Đã lưu ${destFileName}`);
      } catch (err) {
        console.error(`❌ Lỗi xử lý ${matchedFile}:`, err);
      }
    } else {
      console.warn(`⚠️ Không tìm thấy ảnh AI cho prefix: ${aiPrefix}`);
    }
  }

  // Bước 2: Tải và xử lý các ảnh Unsplash
  console.log('\n--- Bước 2: Tải và xử lý ảnh Unsplash (Quota fallback) ---');
  for (const img of unsplashImages) {
    const destPath = path.join(outputDir, img.key);
    console.log(`Đang tải & xử lý Unsplash: ${img.key} từ ${img.url}`);
    try {
      const response = await fetch(img.url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      await sharp(buffer)
        .resize(1440, 1080, { fit: 'cover' })
        .webp({ quality: 80 })
        .toFile(destPath);
      console.log(`✅ Đã tải & xử lý thành công ${img.key}`);
    } catch (err) {
      console.error(`❌ Lỗi tải/xử lý Unsplash ${img.key}:`, err);
    }
  }

  // Bước 3: Nhân bản các ảnh nhóm B từ nhóm A (Tiết kiệm tài nguyên)
  console.log('\n--- Bước 3: Sao chép các ảnh nhóm B tương ứng từ nhóm A ---');
  const copyMappings = {
    'career-goc-lam-viec.webp': 'khong-gian.webp',
    'leisure-du-lich.webp': 'du-lich.webp',
    'family-to-am.webp': 'nha.webp',
    'health-van-dong.webp': 'van-dong.webp',
    'leisure-thien-nhien.webp': 'thien-nhien.webp',
    'education-doc-sach.webp': 'sach.webp',
    'health-dinh-duong.webp': 'am-thuc.webp',
    'leisure-nghi-ngoi-sang-tao.webp': 'nghe-thuat.webp'
  };

  for (const [srcName, destName] of Object.entries(copyMappings)) {
    const srcPath = path.join(outputDir, srcName);
    const destPath = path.join(outputDir, destName);
    if (fs.existsSync(srcPath)) {
      console.log(`Sao chép: ${srcName} -> ${destName}`);
      fs.copyFileSync(srcPath, destPath);
      console.log(`✅ Đã sao chép sang ${destName}`);
    } else {
      console.error(`❌ Lỗi: File gốc ${srcName} không tồn tại để sao chép.`);
    }
  }

  console.log('\n--- Hoàn tất xử lý ảnh! ---');
}

main().catch(err => {
  console.error('Lỗi nghiêm trọng trong script chính:', err);
  process.exit(1);
});
