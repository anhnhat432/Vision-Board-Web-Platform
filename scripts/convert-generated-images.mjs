import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const artifactDir = 'C:\\Users\\admin\\.gemini\\antigravity\\brain\\7ec1ed6b-ba85-4f90-8f8e-c912056ba477';
const outputDir = 'd:\\Projects\\Vision Board Web Platform\\public\\curated\\vision-board';

const imageMappings = [
  { src: 'watercolor_painting_still_life_1781734203942.png', dest: 'nghe-thuat.webp' },
  { src: 'wildflowers_ceramic_vase_1781734212924.png', dest: 'thien-nhien.webp' },
  { src: 'windowsill_potted_plants_1781734223780.png', dest: 'leisure-thien-nhien.webp' },
  { src: 'pastel_travel_flat_lay_1781734234710.png', dest: 'du-lich.webp' },
  { src: 'staycation_cozy_corner_1781734243776.png', dest: 'leisure-du-lich.webp' },
  { src: 'sunrise_city_skyline_1781734254985.png', dest: 'thanh-pho.webp' },
  { src: 'indoor_gardening_still_life_1781734267001.png', dest: 'vuon.webp' },
  { src: 'family_dinner_table_1781734276099.png', dest: 'family-bua-toi.webp' },
  { src: 'morning_tea_windowsill_1781734290126.png', dest: 'binh-minh.webp' },
  { src: 'relaxing_creative_corner_1781734300312.png', dest: 'leisure-nghi-ngoi-sang-tao.webp' },
  { src: 'weekend_family_picnic_1781734314641.png', dest: 'family-cuoi-tuan.webp' },
  { src: 'peaceful_reflective_moment_1781734323631.png', dest: 'growth-suy-ngam.webp' },
  { src: 'skill_practice_desk_1781734335807.png', dest: 'growth-thuc-hanh.webp' },
  { src: 'open_journal_candle_1781734346096.png', dest: 'growth-viet-nhat-ky.webp' }
];

async function run() {
  console.log('--- KHỞI ĐỘNG CHUYỂN ĐỔI 14 ẢNH SANG WEBP ---');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (const mapping of imageMappings) {
    const srcPath = path.join(artifactDir, mapping.src);
    const destPath = path.join(outputDir, mapping.dest);
    
    if (!fs.existsSync(srcPath)) {
      console.error(`❌ Không tìm thấy file nguồn: ${srcPath}`);
      continue;
    }

    console.log(`Đang xử lý: ${mapping.src} -> ${mapping.dest}...`);
    try {
      // Resize về 1440x1080 (tỷ lệ 4:3), nén webp chất lượng 80
      await sharp(srcPath)
        .resize(1440, 1080, { fit: 'cover' })
        .webp({ quality: 80 })
        .toFile(destPath);
      console.log(`  ✅ Thành công: ${mapping.dest}`);
    } catch (err) {
      console.error(`  ❌ Thất bại khi ghi đè ${mapping.dest}:`, err);
    }
  }

  console.log('--- HOÀN TẤT CHUYỂN ĐỔI ---');
}

run().catch(err => {
  console.error('Lỗi nghiêm trọng:', err);
  process.exit(1);
});
