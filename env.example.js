// Tệp cấu hình kết nối Supabase dành cho ứng dụng tính lương
// Hướng dẫn: Tạo một tệp tên là 'env.js' nằm cùng cấp với tệp này và điền URL & Key thực tế của bạn.

window.SUPABASE_URL = "https://abcdefghijklmnopqrst.supabase.co";
window.SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";

// Cloudflare Turnstile CAPTCHA (biến môi trường phía server cho /api/config)
// Cấu hình TURNSTILE_SITE_KEY trong Vercel Project Environment Variables.
// /api/config sẽ trả về turnstileSiteKey cho client khi mở modal đăng nhập/đăng ký.
// Lưu ý bảo mật: Turnstile Secret Key chỉ đặt trong Supabase Dashboard (Auth -> Attack Protection),
// tuyệt đối KHÔNG đưa secret xuống client hay khai báo trong env.js.
// TURNSTILE_SITE_KEY="0x4AAAAAAAxxxxxxxxxxxxxxxx"
