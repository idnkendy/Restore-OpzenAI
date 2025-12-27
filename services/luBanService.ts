export interface LuBanCategory {
  name: string;
  good: boolean;
  sub: string[];
}

export interface LuBanRulerData {
  name: string;
  description: string;
  cycle: number; // in mm
  categories: LuBanCategory[];
}

export interface LuBanResult {
  main: string;
  sub: string;
  isGood: boolean;
}

export const RULER_52_2_DATA: LuBanRulerData = {
  name: 'Thước Lỗ Ban 52.2cm',
  description: 'Khoảng thông thủy (cửa, cửa sổ...)',
  cycle: 522, // mm
  categories: [
    { name: 'Quý Nhân', good: true, sub: ['Quyền Tước', 'Tài Lộc', 'Trung Tín', 'Tác Quan'] },
    { name: 'Hiểm Họa', good: false, sub: ['Tán Tải', 'Quan Quỷ', 'Kiếp Tải', 'Độc Hại'] },
    { name: 'Thiên Tai', good: false, sub: ['Trường Bệnh', 'Tố Tụng', 'Lao Chấp', 'Ôn Hoàng'] },
    { name: 'Thiên Tài', good: true, sub: ['Thi Thơ', 'Hoạch Tài', 'Hiếu Tử', 'Quý Nhân'] },
    { name: 'Nhân Lộc', good: true, sub: ['Trí Tồn', 'Phú Quý', 'Tiến Bửu', 'Thập Thiện'] },
    { name: 'Cô Độc', good: false, sub: ['Bạc Nghịch', 'Vô Vọng', 'Ly Hương', 'Tử Biệt'] },
    { name: 'Thiên Tặc', good: false, sub: ['Bệnh Chí', 'Quan Tài', 'Cô Quả', 'Thoái Tài'] },
    { name: 'Tể Tướng', good: true, sub: ['Đại Tài', 'Hỷ Sự', 'Tiến Ích', 'Lục Hợp'] },
  ]
};

export const RULER_42_9_DATA: LuBanRulerData = {
  name: 'Thước Lỗ Ban 42.9cm (Dương trạch)',
  description: 'Khối xây dựng (bếp, bệ, bậc...)',
  cycle: 429, // mm
  categories: [
    { name: 'Tài', good: true, sub: ['Tài Đức', 'Báo Khố', 'Lục Hợp', 'Nghênh Phúc'] },
    { name: 'Bệnh', good: false, sub: ['Thoái Tài', 'Công Sự', 'Lao Chấp', 'Cô Quả'] },
    { name: 'Ly', good: false, sub: ['Trường Khố', 'Kiếp Tài', 'Quan Quỷ', 'Thất Thoát'] },
    { name: 'Nghĩa', good: true, sub: ['Thêm Đinh', 'Ích Lợi', 'Quý Tử', 'Đại Cát'] },
    { name: 'Quan', good: true, sub: ['Thuận Khoa', 'Hoạch Tài', 'Tiến Ích', 'Phú Quý'] },
    { name: 'Kiếp', good: false, sub: ['Tử Biệt', 'Thoái Khẩu', 'Ly Hương', 'Tài Thất'] },
    { name: 'Hại', good: false, sub: ['Tai Chí', 'Tử Tuyệt', 'Bệnh Lâm', 'Khẩu Thiệt'] },
    { name: 'Bản', good: true, sub: ['Tài Chí', 'Đăng Khoa', 'Tiến Bảo', 'Hưng Vượng'] }
  ]
};


export const getLuBanResult = (dimension: number, ruler: LuBanRulerData): LuBanResult | null => {
    if (dimension <= 0 || isNaN(dimension)) return null;

    const valueInCycle = (dimension - 1) % ruler.cycle;
    
    const categoryWidth = ruler.cycle / ruler.categories.length;
    const mainCategoryIndex = Math.floor(valueInCycle / categoryWidth);
    const mainCategory = ruler.categories[mainCategoryIndex];

    const subCategoryWidth = categoryWidth / mainCategory.sub.length;
    const valueInMainCategory = valueInCycle % categoryWidth;
    const subCategoryIndex = Math.floor(valueInMainCategory / subCategoryWidth);
    const subCategory = mainCategory.sub[subCategoryIndex];

    return {
        main: mainCategory.name,
        sub: subCategory,
        isGood: mainCategory.good
    };
};
