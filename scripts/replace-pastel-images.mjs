import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.resolve(__dirname, '../public/curated/vision-board');

// Danh sách 14 ảnh cần làm lại với URL Unsplash được tuyển chọn chuẩn pastel
const targetImages = [
  {
    key: 'nghe-thuat.webp',
    url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=1600&q=80',
    desc: 'Màu nước pastel + cọ + giấy kem + hoa khô'
  },
  {
    key: 'leisure-nghi-ngoi-sang-tao.webp',
    url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=1600&q=80',
    desc: 'Góc thư giãn cozy: sổ phác thảo + trà + nắng'
  },
  {
    key: 'thien-nhien.webp',
    url: 'https://images.unsplash.com/photo-1508789454646-bef72439f197?w=1600&q=80',
    desc: 'Bình hoa đồng nội + nắng qua cửa sổ sheer'
  },
  {
    key: 'leisure-thien-nhien.webp',
    url: 'https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?w=1600&q=80',
    desc: 'Cánh đồng hoa sương sớm màu phấn soft'
  },
  {
    key: 'du-lich.webp',
    url: 'https://images.unsplash.com/photo-1506012787146-f92b2d7d6d96?w=1600&q=80',
    desc: 'Vali pastel + bản đồ + máy ảnh + hoa khô'
  },
  {
    key: 'leisure-du-lich.webp',
    url: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1600&q=80',
    desc: 'Nghỉ dưỡng pastel: ghế lounge + nắng nhẹ'
  },
  {
    key: 'thanh-pho.webp',
    url: 'https://images.unsplash.com/photo-1518391846015-55a9cc003b25?w=1600&q=80',
    desc: 'Cửa sổ nhìn ra phố bình minh, rèm voan, cà phê'
  },
  {
    key: 'vuon.webp',
    url: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=1600&q=80',
    desc: 'Chậu cây nhỏ + dụng cụ mini trên bàn gỗ sáng'
  },
  {
    key: 'family-bua-toi.webp',
    url: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=1600&q=80',
    desc: 'Bàn ăn gia đình ấm cúng, nến, tông kem pastel'
  },
  {
    key: 'family-cuoi-tuan.webp',
    url: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=1600&q=80',
    desc: 'Gia đình picnic trong vườn nắng dịu pastel'
  },
  {
    key: 'growth-suy-ngam.webp',
    url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1600&q=80',
    desc: 'Ngồi bên cửa sổ với trà, ánh sáng dịu suy tư'
  },
  {
    key: 'growth-thuc-hanh.webp',
    url: 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=1600&q=80',
    desc: 'Bàn luyện kỹ năng piano/vẽ tông pastel ấm'
  },
  {
    key: 'growth-viet-nhat-ky.webp',
    url: 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=1600&q=80',
    desc: 'Sổ tay mở + bút + hoa khô + nến bàn pastel'
  },
  {
    key: 'binh-minh.webp',
    url: 'https://images.unsplash.com/photo-1522441815192-d9f04eb0615c?w=1600&q=80',
    desc: 'Tách trà bên cửa sổ bình minh, rèm voan, hoa'
  }
];

async function run() {
  console.log('--- KHỞI ĐỘNG CẬP NHẬT 14 ẢNH PASTEL ---');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (const img of targetImages) {
    const destPath = path.join(outputDir, img.key);
    console.log(`Đang tải & xử lý: ${img.key} (${img.desc})...`);
    try {
      const response = await fetch(img.url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Resize về 1440x1080 (tỷ lệ 4:3), nén webp chất lượng 80
      await sharp(buffer)
        .resize(1440, 1080, { fit: 'cover' })
        .webp({ quality: 80 })
        .toFile(destPath);
      console.log(`✅ Thành công: ${img.key}`);
    } catch (err) {
      console.error(`❌ Thất bại ${img.key}:`, err);
    }
  }

  console.log('--- HOÀN TẤT CẬP NHẬT ---');
}

run().catch(err => {
  console.error('Lỗi nghiêm trọng:', err);
  process.exit(1);
});
