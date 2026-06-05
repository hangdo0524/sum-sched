/**
 * Strategic Planning Module
 * Step 1-4: Thu thập thông tin → AI phân tích → Lộ trình 12 năm
 */

import { ref, get, set, push } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';

let db = null;

export function initStrategicPlanning(database) {
  db = database;
}

// ============================================
// DATA MODELS
// ============================================

/**
 * Student Context - Năng lực học sinh
 */
export const SUBJECT_LEVELS = {
  1: 'Yếu - Cần hỗ trợ nhiều',
  2: 'Yếu - Cần cải thiện',
  3: 'Trung bình yếu',
  4: 'Trung bình',
  5: 'Trung bình khá',
  6: 'Khá',
  7: 'Khá giỏi',
  8: 'Giỏi',
  9: 'Xuất sắc',
  10: 'Xuất sắc - Năng khiếu'
};

export const SKILL_LEVELS = {
  1: 'Rất yếu',
  2: 'Yếu',
  3: 'Cần cải thiện',
  4: 'Trung bình',
  5: 'Khá',
  6: 'Tốt',
  7: 'Rất tốt',
  8: 'Xuất sắc',
  9: 'Nổi bật',
  10: 'Đặc biệt'
};

export const LEARNING_STYLES = {
  visual: { name: 'Nhìn (Visual)', desc: 'Học tốt qua hình ảnh, sơ đồ, video' },
  auditory: { name: 'Nghe (Auditory)', desc: 'Học tốt qua nghe giảng, thảo luận' },
  kinesthetic: { name: 'Vận động (Kinesthetic)', desc: 'Học tốt qua thực hành, làm' },
  mixed: { name: 'Kết hợp', desc: 'Phù hợp nhiều phương pháp' }
};

export const ACADEMIC_PRIORITIES = {
  balanced: { name: 'Cân bằng', desc: 'Phát triển đều các môn' },
  specialized: { name: 'Chuyên sâu', desc: 'Tập trung vào 1-2 môn mạnh' },
  olympiad: { name: 'Học sinh giỏi', desc: 'Hướng thi HSG, Olympic' }
};

// Default subjects by grade level
export const SUBJECTS_BY_LEVEL = {
  elementary: ['Toán', 'Tiếng Việt', 'Tiếng Anh', 'Khoa học', 'Lịch sử-Địa lý', 'Tin học', 'Mỹ thuật', 'Âm nhạc', 'Thể dục'],
  middle: ['Toán', 'Ngữ văn', 'Tiếng Anh', 'Vật lý', 'Hóa học', 'Sinh học', 'Lịch sử', 'Địa lý', 'GDCD', 'Tin học', 'Công nghệ'],
  high: ['Toán', 'Ngữ văn', 'Tiếng Anh', 'Vật lý', 'Hóa học', 'Sinh học', 'Lịch sử', 'Địa lý', 'GDCD', 'Tin học']
};

// School types
export const SCHOOL_TYPES = {
  public: { name: 'Công lập', desc: 'Trường công lập theo chương trình Bộ GD&ĐT' },
  private: { name: 'Tư thục', desc: 'Trường tư thục Việt Nam' },
  international: { name: 'Quốc tế', desc: 'Trường quốc tế, song ngữ' },
  specialized: { name: 'Chuyên', desc: 'Trường THPT chuyên, năng khiếu' }
};

// Curriculum/Program types - Chi tiết hơn
export const CURRICULUM_TYPES = {
  vn_gdpt: { name: 'GDPT 2018', desc: 'Chương trình giáo dục phổ thông mới Bộ GD&ĐT' },
  vn_gdpt_old: { name: 'GDPT cũ', desc: 'Chương trình trước 2018' },
  // Cambridge system
  cambridge_primary: { name: 'Cambridge Primary', desc: 'Cambridge Primary (Tiểu học)' },
  cambridge_igcse: { name: 'Cambridge IGCSE', desc: 'Cambridge IGCSE (THCS-THPT)' },
  cambridge_alevel: { name: 'Cambridge A-Level', desc: 'Cambridge A-Level (lớp 11-12)' },
  // Oxford system
  oxford_primary: { name: 'Oxford Primary', desc: 'Oxford International Primary' },
  oxford_secondary: { name: 'Oxford Secondary', desc: 'Oxford International Secondary' },
  // IB system
  ib_pyp: { name: 'IB PYP', desc: 'IB Primary Years Programme (3-12 tuổi)' },
  ib_myp: { name: 'IB MYP', desc: 'IB Middle Years Programme (11-16 tuổi)' },
  ib_dp: { name: 'IB DP', desc: 'IB Diploma Programme (16-19 tuổi)' },
  // American
  american_common: { name: 'American', desc: 'Chương trình Mỹ (Common Core)' },
  american_ap: { name: 'American AP', desc: 'Advanced Placement (lớp 11-12)' },
  // Bilingual combinations
  bilingual_cambridge: { name: 'Song ngữ Cambridge', desc: 'VN + Cambridge (VAS, BVIS, AIS...)' },
  bilingual_oxford: { name: 'Song ngữ Oxford', desc: 'VN + Oxford' },
  bilingual_ib: { name: 'Song ngữ IB', desc: 'VN + IB elements' },
  // Others
  montessori: { name: 'Montessori', desc: 'Phương pháp Montessori' },
  steiner: { name: 'Steiner/Waldorf', desc: 'Phương pháp Waldorf' },
  other: { name: 'Khác', desc: 'Chương trình khác' }
};

// Family financial capability for study abroad
export const FINANCIAL_CAPACITY = {
  full_self: { name: 'Tự túc hoàn toàn', desc: 'Có khả năng tài chính du học không cần học bổng' },
  partial_scholarship: { name: 'Cần học bổng bán phần', desc: 'Cần 30-50% học bổng để du học' },
  high_scholarship: { name: 'Cần học bổng cao', desc: 'Cần 70-100% học bổng để du học' },
  full_scholarship: { name: 'Chỉ đi khi có học bổng toàn phần', desc: 'Bắt buộc có full scholarship' }
};

// Stage-based development priorities (Australia scholarship profile building)
export const DEVELOPMENT_STAGES = {
  elementary: {
    name: 'Tiểu học (Lớp 1-5)',
    academic: { weight: 30, focus: 'Nền tảng Toán-Anh, yêu thích học tập' },
    softSkills: { weight: 40, focus: 'Giao tiếp, sáng tạo, tò mò, tự tin' },
    character: { weight: 30, focus: 'Kỷ luật tự giác, trung thực, empathy' }
  },
  middle: {
    name: 'THCS (Lớp 6-9)',
    academic: { weight: 40, focus: 'Academic excellence, IELTS 6.0+, competitions' },
    softSkills: { weight: 35, focus: 'Leadership, teamwork, public speaking, critical thinking' },
    character: { weight: 25, focus: 'Resilience, goal-setting, social responsibility' }
  },
  high: {
    name: 'THPT (Lớp 10-12)',
    academic: { weight: 50, focus: 'GPA 8.5+, IELTS 7.5+, SAT/IB/A-Level, research' },
    softSkills: { weight: 30, focus: 'Project management, entrepreneurship, mentoring' },
    character: { weight: 20, focus: 'Global citizenship, unique story, impact' }
  }
};

// ============================================
// LEARNING RESOURCES DATABASE
// Trung tâm, Gia sư, Ứng dụng tự học
// ============================================

// Learning Centers in Vietnam (by category)
export const LEARNING_CENTERS = {
  english: {
    name: '🌍 Tiếng Anh',
    centers: [
      // Premium International
      { id: 'british_council', name: 'British Council', type: 'international', locations: ['HCM', 'HN', 'DN'], grades: '1-12', focus: ['IELTS', 'Cambridge', 'General'], rating: 5, priceRange: 'high', scholarshipValue: 'very_high', desc: 'Chuẩn British, tốt cho IELTS/Cambridge' },
      { id: 'ila', name: 'ILA Vietnam', type: 'international', locations: ['HCM', 'HN', 'nationwide'], grades: '3-12', focus: ['IELTS', 'Communication', 'Academic'], rating: 4.5, priceRange: 'high', scholarshipValue: 'high', desc: 'Chuỗi lớn, chất lượng ổn định' },
      { id: 'vus', name: 'VUS (Anh Văn Hội Việt Mỹ)', type: 'local_premium', locations: ['HCM', 'nationwide'], grades: '3-12', focus: ['IELTS', 'TOEFL', 'Communication'], rating: 4.5, priceRange: 'medium-high', scholarshipValue: 'high', desc: 'Lâu đời, uy tín tại VN' },
      { id: 'apax', name: 'Apax English', type: 'local_premium', locations: ['nationwide'], grades: '3-15', focus: ['Communication', 'Academic'], rating: 4, priceRange: 'medium', scholarshipValue: 'medium', desc: 'Chuỗi lớn, công nghệ tốt' },
      // IELTS Specialists
      { id: 'ielts_fighter', name: 'IELTS Fighter', type: 'specialist', locations: ['HCM', 'HN', 'online'], grades: '9-12', focus: ['IELTS'], rating: 4.5, priceRange: 'medium', scholarshipValue: 'high', desc: 'Chuyên IELTS, cam kết đầu ra' },
      { id: 'ielts_ngoc_bach', name: 'IELTS Ngọc Bách', type: 'specialist', locations: ['HN', 'online'], grades: '9-12', focus: ['IELTS'], rating: 4.5, priceRange: 'medium', scholarshipValue: 'high', desc: 'Nổi tiếng IELTS Writing' },
      { id: 'the_ielts_workshop', name: 'The IELTS Workshop', type: 'specialist', locations: ['HCM', 'HN', 'online'], grades: '9-12', focus: ['IELTS'], rating: 4.5, priceRange: 'medium', scholarshipValue: 'high', desc: 'Phương pháp hiện đại' },
      // Kids English
      { id: 'popodoo', name: 'Popodoo', type: 'kids', locations: ['HCM', 'HN'], grades: '3-10', focus: ['Cambridge Young Learners', 'Communication'], rating: 4, priceRange: 'medium', scholarshipValue: 'medium', desc: 'Tốt cho trẻ nhỏ' },
      { id: 'yola', name: 'YOLA', type: 'local_premium', locations: ['HCM', 'HN'], grades: 'K-12', focus: ['Academic', 'SAT', 'IELTS'], rating: 4, priceRange: 'high', scholarshipValue: 'high', desc: 'Định hướng du học' }
    ]
  },

  math: {
    name: '🔢 Toán học',
    centers: [
      { id: 'mathnasium', name: 'Mathnasium', type: 'international', locations: ['HCM', 'HN'], grades: 'K-12', focus: ['Math foundation', 'Problem solving'], rating: 4.5, priceRange: 'high', scholarshipValue: 'high', desc: 'Phương pháp Mỹ, tư duy logic' },
      { id: 'kumon_math', name: 'Kumon Toán', type: 'international', locations: ['HCM', 'HN', 'DN'], grades: 'K-12', focus: ['Calculation', 'Self-learning'], rating: 4, priceRange: 'medium', scholarshipValue: 'medium', desc: 'Luyện tính toán, tự học' },
      { id: 'toan_tu_duy', name: 'Toán Tư Duy (POMATH, Finger Math)', type: 'local', locations: ['nationwide'], grades: 'K-6', focus: ['Mental math', 'Logic'], rating: 4, priceRange: 'medium', scholarshipValue: 'medium', desc: 'Toán tư duy cho trẻ nhỏ' },
      { id: 'hsg_toan', name: 'Các lớp HSG Toán', type: 'olympiad', locations: ['HCM', 'HN'], grades: '6-12', focus: ['Olympiad', 'Competition'], rating: 5, priceRange: 'varies', scholarshipValue: 'very_high', desc: 'Luyện thi HSG, Olympic' }
    ]
  },

  stem: {
    name: '🤖 STEM & Robotics',
    centers: [
      { id: 'teky', name: 'TEKY', type: 'local_premium', locations: ['HCM', 'HN', 'nationwide'], grades: '4-16', focus: ['Coding', 'Robotics', 'AI'], rating: 4.5, priceRange: 'medium', scholarshipValue: 'high', desc: 'STEM hàng đầu VN, có WRO team' },
      { id: 'steam_for_vietnam', name: 'STEAM for Vietnam', type: 'nonprofit', locations: ['online', 'nationwide'], grades: '6-18', focus: ['Coding', 'Entrepreneurship'], rating: 4.5, priceRange: 'free-low', scholarshipValue: 'high', desc: 'Miễn phí/giá rẻ, mentor từ Silicon Valley' },
      { id: 'codegym', name: 'CodeGym Kids', type: 'local', locations: ['HCM', 'HN'], grades: '6-18', focus: ['Coding', 'Web/App'], rating: 4, priceRange: 'medium', scholarshipValue: 'medium', desc: 'Lập trình ứng dụng' },
      { id: 'mindx', name: 'MindX', type: 'local_premium', locations: ['HCM', 'HN'], grades: '6-18', focus: ['Coding', 'Technology'], rating: 4, priceRange: 'medium', scholarshipValue: 'medium', desc: 'Công nghệ và khởi nghiệp' },
      { id: 'lego_education', name: 'LEGO Education Center', type: 'international', locations: ['HCM', 'HN'], grades: 'K-9', focus: ['Robotics', 'STEM basics'], rating: 4.5, priceRange: 'high', scholarshipValue: 'medium', desc: 'LEGO Robotics chính hãng' },
      { id: 'fpt_young_talent', name: 'FPT Young Talent', type: 'local_premium', locations: ['nationwide'], grades: '9-12', focus: ['Coding', 'AI', 'Competition'], rating: 4.5, priceRange: 'medium', scholarshipValue: 'high', desc: 'Đào tạo IOI, ICPC' }
    ]
  },

  science: {
    name: '🔬 Khoa học',
    centers: [
      { id: 'curious_minds', name: 'Curious Minds', type: 'international', locations: ['HCM'], grades: '4-12', focus: ['Science experiments', 'Critical thinking'], rating: 4.5, priceRange: 'high', scholarshipValue: 'high', desc: 'Khoa học thực nghiệm' },
      { id: 'science_centre', name: 'Science Centre Vietnam', type: 'local', locations: ['HCM', 'HN'], grades: 'K-12', focus: ['Science fair', 'Projects'], rating: 4, priceRange: 'medium', scholarshipValue: 'medium', desc: 'Dự án khoa học' },
      { id: 'hsg_khtn', name: 'Lớp HSG Lý/Hóa/Sinh', type: 'olympiad', locations: ['HCM', 'HN'], grades: '9-12', focus: ['Olympiad'], rating: 5, priceRange: 'varies', scholarshipValue: 'very_high', desc: 'Luyện thi Olympic KHTN' }
    ]
  },

  soft_skills: {
    name: '💼 Kỹ năng mềm',
    centers: [
      { id: 'vie_debate', name: 'VIE Debate', type: 'specialist', locations: ['HCM', 'HN', 'online'], grades: '6-12', focus: ['Debate', 'Public speaking', 'MUN'], rating: 4.5, priceRange: 'medium', scholarshipValue: 'very_high', desc: 'Tranh biện, MUN hàng đầu' },
      { id: 'toastmasters_youth', name: 'Toastmasters Youth', type: 'international', locations: ['HCM', 'HN'], grades: '9-18', focus: ['Public speaking', 'Leadership'], rating: 4.5, priceRange: 'low', scholarshipValue: 'high', desc: 'Thuyết trình, lãnh đạo' },
      { id: 'kyna', name: 'Kyna for Kids', type: 'local', locations: ['online'], grades: 'K-12', focus: ['Life skills', 'Communication'], rating: 4, priceRange: 'low', scholarshipValue: 'medium', desc: 'Kỹ năng sống online' },
      { id: 'junior_achievement', name: 'Junior Achievement Vietnam', type: 'nonprofit', locations: ['HCM', 'HN'], grades: '9-12', focus: ['Business', 'Entrepreneurship', 'Financial literacy'], rating: 4.5, priceRange: 'free', scholarshipValue: 'high', desc: 'Kinh doanh, khởi nghiệp' }
    ]
  },

  arts: {
    name: '🎨 Nghệ thuật',
    centers: [
      { id: 'yamaha_music', name: 'Yamaha Music School', type: 'international', locations: ['nationwide'], grades: '4+', focus: ['Piano', 'Keyboard', 'Music theory'], rating: 4.5, priceRange: 'medium-high', scholarshipValue: 'medium', desc: 'Âm nhạc chuẩn quốc tế' },
      { id: 'soul_music', name: 'Soul Music Academy', type: 'local_premium', locations: ['HCM', 'HN'], grades: '6+', focus: ['Instruments', 'Vocal'], rating: 4.5, priceRange: 'high', scholarshipValue: 'medium', desc: 'Đào tạo chuyên sâu' },
      { id: 'fine_arts', name: 'Trung tâm Mỹ thuật (VFA, Art Studio)', type: 'local', locations: ['nationwide'], grades: 'K-18', focus: ['Drawing', 'Painting', 'Portfolio'], rating: 4, priceRange: 'medium', scholarshipValue: 'medium', desc: 'Mỹ thuật, xây portfolio' }
    ]
  }
};

// Self-Learning Apps & Platforms (by subject and stage)
export const SELF_LEARNING_APPS = {
  english: {
    name: '🌍 Tiếng Anh',
    apps: [
      // Premium
      { id: 'elsa', name: 'ELSA Speak', type: 'app', platform: 'iOS/Android', grades: '1-12', focus: ['Pronunciation', 'Speaking'], pricing: 'freemium', scholarshipValue: 'high', desc: 'AI phát âm, made in VN' },
      { id: 'duolingo', name: 'Duolingo', type: 'app', platform: 'all', grades: 'K-12', focus: ['Vocabulary', 'Grammar', 'Gamification'], pricing: 'freemium', scholarshipValue: 'medium', desc: 'Học qua game, phổ biến nhất' },
      { id: 'cake', name: 'Cake - Learn English', type: 'app', platform: 'iOS/Android', grades: '6-12', focus: ['Listening', 'Speaking', 'Video'], pricing: 'freemium', scholarshipValue: 'medium', desc: 'Học qua video ngắn' },
      // IELTS specific
      { id: 'ielts_liz', name: 'IELTS Liz', type: 'website', platform: 'web', grades: '9-12', focus: ['IELTS all skills'], pricing: 'free', scholarshipValue: 'very_high', desc: 'Tài liệu IELTS miễn phí hàng đầu' },
      { id: 'ielts_simon', name: 'IELTS Simon', type: 'website', platform: 'web', grades: '9-12', focus: ['IELTS Writing', 'Speaking'], pricing: 'free', scholarshipValue: 'very_high', desc: 'Writing band 9 samples' },
      { id: 'road_to_ielts', name: 'Road to IELTS (British Council)', type: 'platform', platform: 'web', grades: '9-12', focus: ['IELTS preparation'], pricing: 'free-paid', scholarshipValue: 'very_high', desc: 'Luyện thi chính thức' },
      // Reading
      { id: 'epic', name: 'Epic! Kids Books', type: 'app', platform: 'iOS/Android', grades: 'K-6', focus: ['Reading', 'Vocabulary'], pricing: 'subscription', scholarshipValue: 'medium', desc: '40,000+ sách tiếng Anh' },
      { id: 'newsela', name: 'Newsela', type: 'platform', platform: 'web', grades: '3-12', focus: ['Reading', 'Current events'], pricing: 'freemium', scholarshipValue: 'high', desc: 'Đọc tin tức theo level' }
    ]
  },

  math: {
    name: '🔢 Toán học',
    apps: [
      { id: 'khan_academy', name: 'Khan Academy', type: 'platform', platform: 'all', grades: 'K-12', focus: ['All math', 'Video lessons'], pricing: 'free', scholarshipValue: 'very_high', desc: 'Miễn phí, đầy đủ chương trình' },
      { id: 'brilliant', name: 'Brilliant.org', type: 'platform', platform: 'all', grades: '6-12', focus: ['Problem solving', 'Logic', 'STEM'], pricing: 'subscription', scholarshipValue: 'very_high', desc: 'Tư duy giải quyết vấn đề' },
      { id: 'photomath', name: 'Photomath', type: 'app', platform: 'iOS/Android', grades: '3-12', focus: ['Solving', 'Step-by-step'], pricing: 'freemium', scholarshipValue: 'medium', desc: 'Giải toán bằng camera' },
      { id: 'ixl_math', name: 'IXL Math', type: 'platform', platform: 'web', grades: 'K-12', focus: ['Practice', 'Adaptive'], pricing: 'subscription', scholarshipValue: 'high', desc: 'Luyện tập adaptive' },
      // Competition prep
      { id: 'aops', name: 'Art of Problem Solving (AoPS)', type: 'platform', platform: 'web', grades: '5-12', focus: ['Olympiad', 'Competition math'], pricing: 'paid', scholarshipValue: 'very_high', desc: 'Tốt nhất cho thi Toán quốc tế' },
      { id: 'mathcounts', name: 'MATHCOUNTS Trainer', type: 'app', platform: 'web', grades: '6-9', focus: ['Competition'], pricing: 'free', scholarshipValue: 'high', desc: 'Luyện đề thi' }
    ]
  },

  coding: {
    name: '💻 Lập trình',
    apps: [
      // For beginners (K-6)
      { id: 'scratch', name: 'Scratch', type: 'platform', platform: 'web', grades: 'K-6', focus: ['Block coding', 'Logic'], pricing: 'free', scholarshipValue: 'medium', desc: 'MIT, nhập môn lập trình' },
      { id: 'code_org', name: 'Code.org', type: 'platform', platform: 'web', grades: 'K-12', focus: ['CS fundamentals'], pricing: 'free', scholarshipValue: 'medium', desc: 'Hour of Code, cơ bản' },
      // Intermediate (6-9)
      { id: 'codecademy', name: 'Codecademy', type: 'platform', platform: 'web', grades: '6-12', focus: ['Python', 'Web', 'Data'], pricing: 'freemium', scholarshipValue: 'high', desc: 'Học ngôn ngữ lập trình' },
      { id: 'replit', name: 'Replit', type: 'platform', platform: 'web', grades: '6-12', focus: ['Coding practice', 'Projects'], pricing: 'freemium', scholarshipValue: 'high', desc: 'Code online, dự án thực tế' },
      // Competition (9-12)
      { id: 'leetcode', name: 'LeetCode', type: 'platform', platform: 'web', grades: '9-12', focus: ['Algorithms', 'Interview prep'], pricing: 'freemium', scholarshipValue: 'very_high', desc: 'Luyện thuật toán' },
      { id: 'codeforces', name: 'Codeforces', type: 'platform', platform: 'web', grades: '9-12', focus: ['Competitive programming'], pricing: 'free', scholarshipValue: 'very_high', desc: 'Thi đấu lập trình, IOI prep' },
      { id: 'usaco_guide', name: 'USACO Guide', type: 'platform', platform: 'web', grades: '9-12', focus: ['USACO preparation'], pricing: 'free', scholarshipValue: 'very_high', desc: 'Chuẩn bị thi USACO' }
    ]
  },

  science: {
    name: '🔬 Khoa học',
    apps: [
      { id: 'khan_science', name: 'Khan Academy Science', type: 'platform', platform: 'all', grades: '6-12', focus: ['Physics', 'Chemistry', 'Biology'], pricing: 'free', scholarshipValue: 'high', desc: 'Video bài giảng miễn phí' },
      { id: 'phet', name: 'PhET Simulations', type: 'platform', platform: 'web', grades: '3-12', focus: ['Interactive simulations'], pricing: 'free', scholarshipValue: 'high', desc: 'Mô phỏng thí nghiệm' },
      { id: 'labxchange', name: 'LabXchange (Harvard)', type: 'platform', platform: 'web', grades: '9-12', focus: ['Virtual labs', 'Research'], pricing: 'free', scholarshipValue: 'very_high', desc: 'Lab ảo từ Harvard' },
      { id: 'crash_course', name: 'CrashCourse (YouTube)', type: 'video', platform: 'YouTube', grades: '6-12', focus: ['All sciences'], pricing: 'free', scholarshipValue: 'medium', desc: 'Video ngắn, dễ hiểu' }
    ]
  },

  soft_skills: {
    name: '💼 Kỹ năng mềm',
    apps: [
      { id: 'coursera_leadership', name: 'Coursera - Leadership courses', type: 'platform', platform: 'web', grades: '9-12', focus: ['Leadership', 'Management'], pricing: 'freemium', scholarshipValue: 'high', desc: 'Khóa học từ ĐH hàng đầu' },
      { id: 'linkedin_learning', name: 'LinkedIn Learning', type: 'platform', platform: 'all', grades: '9-12', focus: ['Professional skills'], pricing: 'subscription', scholarshipValue: 'medium', desc: 'Kỹ năng chuyên nghiệp' },
      { id: 'ted_ed', name: 'TED-Ed', type: 'video', platform: 'web/YouTube', grades: '6-12', focus: ['Critical thinking', 'Ideas'], pricing: 'free', scholarshipValue: 'high', desc: 'Video học tập hay' },
      { id: 'debate_app', name: 'Kialo Edu', type: 'platform', platform: 'web', grades: '6-12', focus: ['Critical thinking', 'Debate'], pricing: 'free', scholarshipValue: 'high', desc: 'Luyện tranh luận logic' }
    ]
  },

  test_prep: {
    name: '📝 Luyện thi chuẩn hóa',
    apps: [
      { id: 'khan_sat', name: 'Khan Academy SAT Prep', type: 'platform', platform: 'web', grades: '10-12', focus: ['SAT'], pricing: 'free', scholarshipValue: 'very_high', desc: 'Official SAT prep miễn phí' },
      { id: 'magoosh', name: 'Magoosh', type: 'platform', platform: 'all', grades: '10-12', focus: ['SAT', 'GRE', 'IELTS'], pricing: 'subscription', scholarshipValue: 'very_high', desc: 'Video + practice tests' },
      { id: 'testglider', name: 'TestGlider', type: 'platform', platform: 'web', grades: '10-12', focus: ['Digital SAT'], pricing: 'freemium', scholarshipValue: 'very_high', desc: 'Mock tests Digital SAT' }
    ]
  },

  vietnamese: {
    name: '📚 Học tập VN',
    apps: [
      { id: 'hocmai', name: 'Hocmai.vn', type: 'platform', platform: 'web', grades: '1-12', focus: ['All VN curriculum'], pricing: 'subscription', scholarshipValue: 'medium', desc: 'Học theo chương trình VN' },
      { id: 'vietjack', name: 'VietJack', type: 'platform', platform: 'web', grades: '1-12', focus: ['Practice', 'Exams'], pricing: 'freemium', scholarshipValue: 'medium', desc: 'Đề thi, bài tập' },
      { id: 'olm', name: 'OLM.vn', type: 'platform', platform: 'web', grades: '1-12', focus: ['Math', 'Exercises'], pricing: 'freemium', scholarshipValue: 'medium', desc: 'Toán online' },
      { id: 'zalo_hoc', name: 'Zalo Học (Kiến Guru, Monkey)', type: 'app', platform: 'iOS/Android', grades: 'K-6', focus: ['Interactive learning'], pricing: 'subscription', scholarshipValue: 'medium', desc: 'Học tương tác cho trẻ nhỏ' }
    ]
  }
};

// Stage-based recommendations
export const STAGE_RESOURCE_RECOMMENDATIONS = {
  elementary: {
    name: 'Tiểu học (Lớp 1-5)',
    priority: ['foundation', 'interest', 'habits'],
    recommended: {
      english: ['duolingo', 'elsa', 'epic', 'popodoo'],
      math: ['khan_academy', 'kumon_math', 'toan_tu_duy'],
      coding: ['scratch', 'code_org'],
      stem: ['lego_education', 'teky'],
      reading: ['epic', 'vietjack']
    },
    goals: ['Build strong foundation', 'Develop love for learning', 'Good study habits']
  },
  middle: {
    name: 'THCS (Lớp 6-9)',
    priority: ['academic_excellence', 'competitions', 'english_proficiency'],
    recommended: {
      english: ['ila', 'vus', 'ielts_liz', 'cake'],
      math: ['brilliant', 'aops', 'mathcounts'],
      coding: ['codecademy', 'replit', 'teky'],
      science: ['phet', 'khan_science'],
      stem: ['teky', 'steam_for_vietnam', 'fpt_young_talent'],
      soft_skills: ['vie_debate', 'ted_ed']
    },
    goals: ['IELTS 6.0+', 'Win competitions', 'Build portfolio', 'Identify spike']
  },
  high: {
    name: 'THPT (Lớp 10-12)',
    priority: ['scholarship_ready', 'test_scores', 'leadership', 'unique_story'],
    recommended: {
      english: ['british_council', 'ielts_fighter', 'road_to_ielts'],
      math: ['aops', 'brilliant'],
      coding: ['leetcode', 'codeforces', 'usaco_guide'],
      science: ['labxchange', 'khan_science'],
      test_prep: ['khan_sat', 'magoosh'],
      soft_skills: ['vie_debate', 'coursera_leadership', 'junior_achievement']
    },
    goals: ['IELTS 7.5+', 'SAT 1400+', 'Major awards', 'Strong leadership evidence']
  }
};

// Top 5 Australian universities requirements
  melbourne: { name: 'University of Melbourne', ielts: 6.5, gpa: 'Top 10%', extras: 'Leadership, community service' },
  sydney: { name: 'University of Sydney', ielts: 6.5, gpa: 'Top 10%', extras: 'Academic achievements, extracurriculars' },
  unsw: { name: 'UNSW Sydney', ielts: 6.5, gpa: 'Top 15%', extras: 'STEM focus, innovation' },
  anu: { name: 'Australian National University', ielts: 6.5, gpa: 'Top 10%', extras: 'Research potential' },
  monash: { name: 'Monash University', ielts: 6.5, gpa: 'Top 15%', extras: 'Global experience' }
};

export const SKILLS = [
  { id: 'problemSolving', name: 'Giải quyết vấn đề' },
  { id: 'creativity', name: 'Sáng tạo' },
  { id: 'communication', name: 'Giao tiếp' },
  { id: 'teamwork', name: 'Làm việc nhóm' },
  { id: 'selfStudy', name: 'Tự học' },
  { id: 'timeManagement', name: 'Quản lý thời gian' },
  { id: 'focus', name: 'Tập trung' },
  { id: 'resilience', name: 'Kiên trì' }
];

// English proficiency levels with IELTS equivalent
export const ENGLISH_LEVELS = {
  beginner: { name: 'Beginner', ielts: '< 3.0', desc: 'Mới bắt đầu học' },
  elementary: { name: 'Elementary', ielts: '3.0-4.0', desc: 'Giao tiếp cơ bản' },
  pre_intermediate: { name: 'Pre-Intermediate', ielts: '4.0-5.0', desc: 'Hiểu nội dung đơn giản' },
  intermediate: { name: 'Intermediate', ielts: '5.0-6.0', desc: 'Giao tiếp tốt trong nhiều tình huống' },
  upper_intermediate: { name: 'Upper-Intermediate', ielts: '6.0-7.0', desc: 'Sử dụng thành thạo học thuật' },
  advanced: { name: 'Advanced', ielts: '7.0+', desc: 'Gần như native speaker' }
};

// Achievement/Competition categories
export const ACHIEVEMENT_CATEGORIES = {
  academic_olympiad: { name: 'Olympic/HSG', weight: 5, examples: ['Olympic Toán', 'HSG Quốc gia', 'Khoa học kỹ thuật'] },
  stem_competition: { name: 'STEM', weight: 4, examples: ['Robotics', 'Coding', 'Science Fair'] },
  english_competition: { name: 'Tiếng Anh', weight: 4, examples: ['IELTS', 'Spelling Bee', 'Debate'] },
  arts_culture: { name: 'Nghệ thuật', weight: 3, examples: ['Âm nhạc', 'Mỹ thuật', 'Viết văn'] },
  sports: { name: 'Thể thao', weight: 3, examples: ['Giải vô địch', 'Đại hội TDTT'] },
  leadership: { name: 'Lãnh đạo', weight: 4, examples: ['MUN', 'Student Council', 'Club President'] },
  community_service: { name: 'Cộng đồng', weight: 4, examples: ['Volunteer', 'Social project', 'Charity'] },
  entrepreneurship: { name: 'Khởi nghiệp', weight: 4, examples: ['Startup', 'Business competition'] }
};

// Popular International Competitions in Vietnam (valuable for Australia scholarship)
export const POPULAR_COMPETITIONS = {
  // === MATH ===
  math: {
    name: '🔢 Toán học',
    competitions: [
      { id: 'imo', name: 'IMO - International Mathematical Olympiad', level: 'international', grades: '10-12', value: 'highest', desc: 'Olympic Toán Quốc tế - Giải cao nhất' },
      { id: 'apmo', name: 'APMO - Asian Pacific Math Olympiad', level: 'international', grades: '10-12', value: 'very_high', desc: 'Olympic Toán Châu Á - Thái Bình Dương' },
      { id: 'amo', name: 'AMO - Australian Math Olympiad', level: 'international', grades: '7-12', value: 'high', desc: 'Olympic Toán Úc - Có giá trị cao cho du học Úc' },
      { id: 'amc', name: 'AMC - Australian Mathematics Competition', level: 'international', grades: '3-12', value: 'medium', desc: 'Kỳ thi Toán Úc phổ biến nhất VN' },
      { id: 'kangaroo', name: 'Math Kangaroo / Kangaroo Toán', level: 'international', grades: '1-12', value: 'medium', desc: 'Kỳ thi Toán Kangaroo toàn cầu' },
      { id: 'sasmo', name: 'SASMO - Singapore Math Olympiad', level: 'international', grades: '2-12', value: 'medium', desc: 'Olympic Toán Singapore' },
      { id: 'seamo', name: 'SEAMO - Southeast Asian Math Olympiad', level: 'international', grades: '4-12', value: 'medium', desc: 'Olympic Toán Đông Nam Á' },
      { id: 'wmtc', name: 'WMTC - World Math Team Championship', level: 'international', grades: '5-12', value: 'high', desc: 'Giải Toán đồng đội thế giới' },
      { id: 'hsg_toan_qg', name: 'HSG Toán Quốc gia', level: 'national', grades: '9-12', value: 'very_high', desc: 'Học sinh giỏi Toán cấp Quốc gia' }
    ]
  },

  // === SCIENCE ===
  science: {
    name: '🔬 Khoa học',
    competitions: [
      { id: 'isef', name: 'ISEF - Intel Science & Engineering Fair', level: 'international', grades: '9-12', value: 'highest', desc: 'Hội thi Khoa học Kỹ thuật Quốc tế lớn nhất' },
      { id: 'ibo', name: 'IBO - International Biology Olympiad', level: 'international', grades: '10-12', value: 'highest', desc: 'Olympic Sinh học Quốc tế' },
      { id: 'icho', name: 'IChO - International Chemistry Olympiad', level: 'international', grades: '10-12', value: 'highest', desc: 'Olympic Hóa học Quốc tế' },
      { id: 'ipho', name: 'IPhO - International Physics Olympiad', level: 'international', grades: '10-12', value: 'highest', desc: 'Olympic Vật lý Quốc tế' },
      { id: 'ieso', name: 'IESO - Earth Science Olympiad', level: 'international', grades: '10-12', value: 'very_high', desc: 'Olympic Khoa học Trái đất Quốc tế' },
      { id: 'vsef', name: 'VSEF - Vietnam Science & Engineering Fair', level: 'national', grades: '9-12', value: 'high', desc: 'Cuộc thi KHKT cấp Quốc gia VN' },
      { id: 'hsg_khtn_qg', name: 'HSG KHTN Quốc gia', level: 'national', grades: '9-12', value: 'very_high', desc: 'HSG Lý/Hóa/Sinh cấp Quốc gia' }
    ]
  },

  // === STEM/TECHNOLOGY ===
  stem: {
    name: '🤖 STEM & Công nghệ',
    competitions: [
      { id: 'frc', name: 'FRC - FIRST Robotics Competition', level: 'international', grades: '9-12', value: 'very_high', desc: 'Robotics lớn nhất thế giới' },
      { id: 'ftc', name: 'FTC - FIRST Tech Challenge', level: 'international', grades: '7-12', value: 'high', desc: 'FIRST Tech Challenge' },
      { id: 'fll', name: 'FLL - FIRST LEGO League', level: 'international', grades: '4-8', value: 'medium', desc: 'FIRST LEGO League cho học sinh nhỏ' },
      { id: 'wro', name: 'WRO - World Robot Olympiad', level: 'international', grades: '6-12', value: 'high', desc: 'Olympic Robot Thế giới' },
      { id: 'ioi', name: 'IOI - International Olympiad in Informatics', level: 'international', grades: '10-12', value: 'highest', desc: 'Olympic Tin học Quốc tế' },
      { id: 'usaco', name: 'USACO - USA Computing Olympiad', level: 'international', grades: '9-12', value: 'very_high', desc: 'Kỳ thi lập trình Mỹ (online)' },
      { id: 'google_code', name: 'Google Code Jam / Kick Start', level: 'international', grades: '10-12', value: 'high', desc: 'Cuộc thi lập trình Google' },
      { id: 'robocon', name: 'Robocon Vietnam', level: 'national', grades: '10-12', value: 'high', desc: 'Robocon Việt Nam' }
    ]
  },

  // === ENGLISH/DEBATE ===
  english: {
    name: '🌍 Tiếng Anh & Hùng biện',
    competitions: [
      { id: 'wsdc', name: 'WSDC - World Schools Debating', level: 'international', grades: '9-12', value: 'very_high', desc: 'Giải Tranh biện Thế giới' },
      { id: 'mun', name: 'MUN - Model United Nations', level: 'international', grades: '9-12', value: 'high', desc: 'Mô phỏng Liên Hợp Quốc (THIMUN, HMUN...)' },
      { id: 'spelling_bee', name: 'Spelling Bee Vietnam', level: 'national', grades: '3-9', value: 'medium', desc: 'Cuộc thi đánh vần tiếng Anh' },
      { id: 'ielts_prize', name: 'IELTS Prize', level: 'international', grades: '10-12', value: 'high', desc: 'Giải thưởng IELTS của British Council' },
      { id: 'go_english', name: 'Go English / English Champion', level: 'national', grades: '3-12', value: 'medium', desc: 'Các cuộc thi tiếng Anh trong nước' },
      { id: 'toefl_junior', name: 'TOEFL Junior Challenge', level: 'international', grades: '6-9', value: 'medium', desc: 'Thử thách TOEFL Junior' }
    ]
  },

  // === LEADERSHIP/SERVICE ===
  leadership: {
    name: '👑 Lãnh đạo & Cộng đồng',
    competitions: [
      { id: 'yseali', name: 'YSEALI - Young Southeast Asian Leaders', level: 'international', grades: '10-12', value: 'very_high', desc: 'Chương trình lãnh đạo trẻ ĐNA của Mỹ' },
      { id: 'global_citizen', name: 'Global Citizen Scholarship', level: 'international', grades: '10-12', value: 'very_high', desc: 'Học bổng Công dân Toàn cầu' },
      { id: 'duke_of_edinburgh', name: "Duke of Edinburgh's Award", level: 'international', grades: '9-12', value: 'high', desc: 'Giải thưởng Công tước Edinburgh' },
      { id: 'student_council', name: 'Student Council / Ban đại diện HS', level: 'school', grades: '6-12', value: 'medium', desc: 'Hội đồng học sinh' },
      { id: 'volunteer_1000h', name: 'Volunteer 1000+ hours', level: 'any', grades: '6-12', value: 'high', desc: 'Tình nguyện trên 1000 giờ' }
    ]
  },

  // === ARTS/CREATIVITY ===
  arts: {
    name: '🎨 Nghệ thuật & Sáng tạo',
    competitions: [
      { id: 'young_artist', name: 'International Young Artist Competition', level: 'international', grades: '6-12', value: 'high', desc: 'Cuộc thi nghệ thuật quốc tế' },
      { id: 'uob_painting', name: 'UOB Painting of the Year', level: 'international', grades: '9-12', value: 'high', desc: 'Giải vẽ tranh UOB' },
      { id: 'steinway', name: 'Steinway Piano Competition', level: 'international', grades: '6-12', value: 'high', desc: 'Cuộc thi Piano Steinway' },
      { id: 'abrsm', name: 'ABRSM Grade 8 / Diploma', level: 'international', grades: '6-12', value: 'medium', desc: 'Chứng chỉ âm nhạc ABRSM cao cấp' },
      { id: 'writing_competition', name: 'International Essay/Writing Competition', level: 'international', grades: '9-12', value: 'medium', desc: 'Cuộc thi viết luận quốc tế' }
    ]
  },

  // === BUSINESS/ENTREPRENEURSHIP ===
  business: {
    name: '💼 Kinh doanh & Khởi nghiệp',
    competitions: [
      { id: 'deca', name: 'DECA International', level: 'international', grades: '9-12', value: 'high', desc: 'Cuộc thi kinh doanh DECA' },
      { id: 'fbla', name: 'FBLA - Future Business Leaders', level: 'international', grades: '9-12', value: 'high', desc: 'Lãnh đạo kinh doanh tương lai' },
      { id: 'diamond_challenge', name: 'Diamond Challenge', level: 'international', grades: '9-12', value: 'high', desc: 'Cuộc thi khởi nghiệp ĐH Delaware' },
      { id: 'startup_weekend', name: 'Startup Weekend Youth', level: 'international', grades: '9-12', value: 'medium', desc: 'Startup Weekend cho học sinh' },
      { id: 'junior_achievement', name: 'Junior Achievement Vietnam', level: 'national', grades: '9-12', value: 'medium', desc: 'Chương trình JA Vietnam' }
    ]
  }
};

export const ACHIEVEMENT_LEVELS = {
  international: { name: 'Quốc tế', points: 100 },
  national: { name: 'Quốc gia', points: 80 },
  regional: { name: 'Vùng/Tỉnh', points: 50 },
  city: { name: 'Thành phố', points: 30 },
  school: { name: 'Trường', points: 10 }
};

// Extracurricular depth levels
export const ACTIVITY_DEPTH = {
  explorer: { name: 'Khám phá', years: '< 1 năm', level: 'Thử nghiệm' },
  committed: { name: 'Cam kết', years: '1-2 năm', level: 'Tham gia đều đặn' },
  dedicated: { name: 'Chuyên tâm', years: '2-4 năm', level: 'Vai trò quan trọng' },
  expert: { name: 'Chuyên sâu', years: '4+ năm', level: 'Thành tích nổi bật' },
  spike: { name: 'SPIKE', years: '3+ năm', level: 'Xuất sắc, độc đáo, có impact' }
};

// ============================================
// DYNAMIC DATA LOADING (External JSON)
// ============================================

let dynamicSchoolsData = null;
let dynamicResourcesData = null;
let lastSchoolsUpdate = null;
let lastResourcesUpdate = null;

/**
 * Fetch schools database from external JSON
 * @param {boolean} forceRefresh - Force reload even if cached
 * @returns {Promise<Object>} Schools data by level
 */
export async function fetchSchoolsData(forceRefresh = false) {
  const CACHE_DURATION = 1000 * 60 * 60; // 1 hour cache

  if (!forceRefresh && dynamicSchoolsData && lastSchoolsUpdate) {
    const age = Date.now() - lastSchoolsUpdate;
    if (age < CACHE_DURATION) {
      console.log('Using cached schools data');
      return dynamicSchoolsData;
    }
  }

  try {
    const response = await fetch('./data/schools.json?t=' + Date.now());
    if (!response.ok) {
      throw new Error(`Failed to fetch schools: ${response.status}`);
    }
    dynamicSchoolsData = await response.json();
    lastSchoolsUpdate = Date.now();
    console.log('Schools data loaded:', Object.keys(dynamicSchoolsData));
    return dynamicSchoolsData;
  } catch (error) {
    console.error('Error loading schools data:', error);
    return null;
  }
}

/**
 * Get schools by level (elementary, middle, high, australia)
 * Handles nested structure: data.elementary.schools[]
 */
export async function getSchoolsByLevel(level) {
  const data = await fetchSchoolsData();
  if (!data || !data[level]) return [];

  // Handle nested structure: level.schools array
  return data[level].schools || data[level] || [];
}

/**
 * Get school by ID
 */
export async function getSchoolById(schoolId) {
  const data = await fetchSchoolsData();
  if (!data) return null;

  for (const level of Object.keys(data)) {
    if (level === '_metadata') continue;
    const schools = data[level].schools || data[level] || [];
    if (!Array.isArray(schools)) continue;
    const school = schools.find(s => s.id === schoolId);
    if (school) return { ...school, level };
  }
  return null;
}

/**
 * Search schools by criteria
 */
export async function searchSchools(criteria = {}) {
  const data = await fetchSchoolsData();
  if (!data) return [];

  const results = [];
  const { level, curriculum, minTuition, maxTuition, hasScholarship, keyword } = criteria;

  const allLevels = Object.keys(data).filter(k => k !== '_metadata');
  const levelsToSearch = level ? [level] : allLevels;

  for (const lvl of levelsToSearch) {
    if (!data[lvl]) continue;
    const schools = data[lvl].schools || data[lvl] || [];
    if (!Array.isArray(schools)) continue;

    for (const school of schools) {
      let match = true;

      // Curriculum can be array or string
      if (curriculum) {
        const schoolCurrs = Array.isArray(school.curriculum) ? school.curriculum : [school.curriculum];
        if (!schoolCurrs.includes(curriculum)) match = false;
      }

      if (hasScholarship && (!school.scholarships || school.scholarships.length === 0)) match = false;

      if (keyword) {
        const curriculumStr = Array.isArray(school.curriculum) ? school.curriculum.join(' ') : school.curriculum;
        const searchStr = `${school.name} ${school.description || ''} ${curriculumStr || ''} ${school.type || ''}`.toLowerCase();
        if (!searchStr.includes(keyword.toLowerCase())) match = false;
      }

      if (match) {
        results.push({ ...school, level: lvl });
      }
    }
  }

  return results;
}

/**
 * Fetch learning resources from external JSON (if exists)
 * Falls back to built-in LEARNING_CENTERS and SELF_LEARNING_APPS
 */
export async function fetchLearningResources(forceRefresh = false) {
  const CACHE_DURATION = 1000 * 60 * 60;

  if (!forceRefresh && dynamicResourcesData && lastResourcesUpdate) {
    const age = Date.now() - lastResourcesUpdate;
    if (age < CACHE_DURATION) {
      return dynamicResourcesData;
    }
  }

  try {
    const response = await fetch('./data/learning-resources.json?t=' + Date.now());
    if (response.ok) {
      dynamicResourcesData = await response.json();
      lastResourcesUpdate = Date.now();
      console.log('External learning resources loaded');
      return dynamicResourcesData;
    }
  } catch (error) {
    console.log('No external resources file, using built-in data');
  }

  // Fallback to built-in
  return {
    centers: LEARNING_CENTERS,
    apps: SELF_LEARNING_APPS,
    recommendations: STAGE_RESOURCE_RECOMMENDATIONS
  };
}

/**
 * Refresh all external data - call this when user wants to update
 */
export async function refreshAllExternalData() {
  console.log('Refreshing all external data...');

  const results = {
    schools: null,
    resources: null,
    timestamp: new Date().toISOString()
  };

  try {
    results.schools = await fetchSchoolsData(true);
    results.resources = await fetchLearningResources(true);
    console.log('All external data refreshed successfully');
  } catch (error) {
    console.error('Error refreshing data:', error);
  }

  return results;
}

/**
 * Get recommended resources for a specific stage and goal
 */
export async function getResourcesForStage(stage, goals = []) {
  const resources = await fetchLearningResources();
  if (!resources) return null;

  const stageRecs = resources.recommendations?.[stage] || STAGE_RESOURCE_RECOMMENDATIONS[stage];
  if (!stageRecs) return null;

  const result = {
    stage,
    stageName: stageRecs.name,
    priority: stageRecs.priority,
    goals: stageRecs.goals,
    recommended: {}
  };

  // Get detailed app info for each recommended category
  for (const [category, appIds] of Object.entries(stageRecs.recommended || {})) {
    result.recommended[category] = appIds.map(appId => {
      // Search in all app categories
      for (const catData of Object.values(resources.apps || SELF_LEARNING_APPS)) {
        const app = catData.apps?.find(a => a.id === appId);
        if (app) return app;
      }
      return { id: appId, name: appId };
    }).filter(Boolean);
  }

  return result;
}

/**
 * Get data status - for UI display
 */
export function getDataStatus() {
  let schoolCount = 0;
  if (dynamicSchoolsData) {
    for (const level of Object.keys(dynamicSchoolsData)) {
      if (level === '_metadata') continue;
      const schools = dynamicSchoolsData[level]?.schools || dynamicSchoolsData[level] || [];
      if (Array.isArray(schools)) schoolCount += schools.length;
    }
  }

  return {
    schools: {
      loaded: !!dynamicSchoolsData,
      lastUpdate: lastSchoolsUpdate ? new Date(lastSchoolsUpdate).toISOString() : null,
      count: schoolCount,
      version: dynamicSchoolsData?._metadata?.version || 'N/A'
    },
    resources: {
      loaded: !!dynamicResourcesData,
      lastUpdate: lastResourcesUpdate ? new Date(lastResourcesUpdate).toISOString() : null,
      usingExternal: !!dynamicResourcesData
    }
  };
}

// ============================================
// STUDENT CONTEXT (Step 1a)
// ============================================

export function createEmptyStudentContext(grade) {
  const level = grade <= 5 ? 'elementary' : grade <= 9 ? 'middle' : 'high';
  const subjects = {};
  SUBJECTS_BY_LEVEL[level].forEach(subj => {
    subjects[subj] = { level: 5, notes: '' };
  });

  const skills = {};
  SKILLS.forEach(s => {
    skills[s.id] = 5;
  });

  return {
    // Basic child info
    basicInfo: {
      name: '',
      birthDate: null, // YYYY-MM-DD
      age: null,
      currentGrade: grade,
      schoolName: '',
      schoolType: 'public',
      curriculum: 'vn_gdpt', // Chương trình học
      academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`
    },

    currentGrade: grade,
    academics: subjects,
    skills: skills,
    talents: [],
    challenges: [],
    learningStyle: 'mixed',
    interests: [],
    hobbies: [],

    // Enhanced: English proficiency details
    englishProfile: {
      currentLevel: 'elementary',
      ieltsScore: null, // null if not tested
      yearsLearning: 0,
      learningMethod: [], // ['school', 'center', 'online', 'native_teacher', 'self_study']
      dailyExposure: 'low' // 'low', 'medium', 'high'
    },

    // Enhanced: Achievement history with categories and levels
    achievements: [], // [{category, level, title, year, description, impact}]

    // Enhanced: Extracurricular activities with depth
    extracurriculars: [], // [{activity, category, yearsInvolved, depth, role, achievements}]

    // Enhanced: Leadership evidence
    leadershipHistory: [], // [{role, organization, duration, impact, description}]

    // Enhanced: Potential "spike" - the unique strength
    potentialSpike: {
      area: '', // What area could be their spike?
      evidence: [], // What evidence supports this?
      developmentPlan: '' // How to develop further?
    }
  };
}

export async function saveStudentContext(userId, childId, context) {
  const data = {
    ...context,
    updatedAt: new Date().toISOString()
  };

  if (!db || !userId) {
    localStorage.setItem(`sumSched_${childId}_studentContext`, JSON.stringify(data));
    return true;
  }

  try {
    await set(ref(db, `studentContext/${userId}/${childId}`), data);
    return true;
  } catch (error) {
    console.error('Error saving student context:', error);
    return false;
  }
}

export async function getStudentContext(userId, childId) {
  if (!db || !userId) {
    const stored = localStorage.getItem(`sumSched_${childId}_studentContext`);
    return stored ? JSON.parse(stored) : null;
  }

  try {
    const snapshot = await get(ref(db, `studentContext/${userId}/${childId}`));
    return snapshot.exists() ? snapshot.val() : null;
  } catch (error) {
    console.error('Error getting student context:', error);
    return null;
  }
}

// ============================================
// FAMILY ASPIRATIONS (Step 1b)
// ============================================

export function createEmptyFamilyAspirations() {
  return {
    // Current context
    currentContext: {
      schoolName: '',
      schoolType: 'public',
      currentPerformance: 'average', // top5, top10, top20, average, below_average
      recentGrades: [], // [{term: 'HK1-2024', subjects: {}, gpa: 8.5}]
      englishLevel: 'basic' // basic, elementary, intermediate, upper_intermediate, advanced
    },
    // Academic goals
    academicGoals: {
      targetHighSchool: '',
      targetUniversity: '',
      targetMajor: '',
      targetCareer: '',
      studyAbroadIntent: true,
      targetCountry: 'australia',
      targetUniRank: 'top5', // top5, top20, top50, any
      scholarshipRequirement: 'full_scholarship' // full_self, partial_scholarship, high_scholarship, full_scholarship
    },
    // Development focus
    developmentFocus: {
      academicPriority: 'balanced',
      extracurricular: [],
      softSkills: [],
      values: [],
      uniqueStrengths: [], // What makes this child unique?
      passions: [] // Deep interests that could become unique story
    },
    // Family resources
    resources: {
      studyTimePerDay: 3,
      budget: 'moderate',
      parentInvolvement: 'medium',
      tutoringAvailable: false,
      onlineResourcesAccess: true,
      networkConnections: [], // Alumni, mentors, references
      studyAbroadBudget: 'scholarship_dependent' // self_funded, partial_support, scholarship_dependent
    },
    // Constraints
    constraints: {
      healthIssues: [],
      familyCommitments: [],
      otherResponsibilities: []
    },

    // Enhanced: Application timeline
    applicationTimeline: {
      targetApplyYear: null, // Year planning to apply (e.g., 2030)
      gapYearConsidered: false,
      preferredPathway: 'direct_entry', // 'direct_entry', 'foundation', 'pathway'
      earlyDecision: false,
      backupCountries: [] // ['uk', 'usa', 'singapore', 'japan']
    }
  };
}

export async function saveFamilyAspirations(userId, childId, aspirations) {
  const data = {
    ...aspirations,
    updatedAt: new Date().toISOString()
  };

  if (!db || !userId) {
    localStorage.setItem(`sumSched_${childId}_familyAspirations`, JSON.stringify(data));
    return true;
  }

  try {
    await set(ref(db, `familyAspirations/${userId}/${childId}`), data);
    return true;
  } catch (error) {
    console.error('Error saving family aspirations:', error);
    return false;
  }
}

export async function getFamilyAspirations(userId, childId) {
  if (!db || !userId) {
    const stored = localStorage.getItem(`sumSched_${childId}_familyAspirations`);
    return stored ? JSON.parse(stored) : null;
  }

  try {
    const snapshot = await get(ref(db, `familyAspirations/${userId}/${childId}`));
    return snapshot.exists() ? snapshot.val() : null;
  } catch (error) {
    console.error('Error getting family aspirations:', error);
    return null;
  }
}

// ============================================
// AI ANALYSIS (Step 2)
// ============================================

/**
 * Generate AI analysis prompt from collected data
 * 5 Expert Perspectives:
 * 1. Australian Study Abroad Specialist (scholarship pathway to top 5)
 * 2. Holistic Development Expert (academic + soft skills + character by stage)
 * 3. Current Context Analyst (school, performance, family capability)
 * 4. Human Potential Development Specialist (psychology, IKIGAI)
 * 5. Scholarship Profile Builder (admission requirements)
 */
export function generateAnalysisPrompt(studentContext, familyAspirations, childInfo) {
  const grade = studentContext.currentGrade;
  const level = grade <= 5 ? 'Tiểu học' : grade <= 9 ? 'THCS' : 'THPT';
  const yearsToGrad12 = 12 - grade;

  // Calculate average academic level
  const academicLevels = Object.values(studentContext.academics).map(a => a.level);
  const avgAcademic = (academicLevels.reduce((a, b) => a + b, 0) / academicLevels.length).toFixed(1);

  // Find strengths and weaknesses
  const strengths = Object.entries(studentContext.academics)
    .filter(([_, v]) => v.level >= 7)
    .map(([k, _]) => k);
  const weaknesses = Object.entries(studentContext.academics)
    .filter(([_, v]) => v.level <= 4)
    .map(([k, _]) => k);

  // Current context from family aspirations
  const currentContext = familyAspirations.currentContext || {};
  const schoolType = SCHOOL_TYPES[currentContext.schoolType]?.name || 'Chưa xác định';
  const financialCapacity = FINANCIAL_CAPACITY[familyAspirations.academicGoals?.scholarshipRequirement]?.name || 'Chưa xác định';

  const prompt = `
Bạn là HỘI ĐỒNG CHUYÊN GIA gồm 5 vai trò, cùng phân tích và đề xuất LỘ TRÌNH HỌC BỔNG TOÀN PHẦN DU HỌC ÚC cho học sinh.

═══════════════════════════════════════════════════════════════════
📋 THÔNG TIN HỌC SINH
═══════════════════════════════════════════════════════════════════

## 1. Thông tin cơ bản
- Tên: ${childInfo.name}
- Lớp hiện tại: ${grade} (${level})
- Số năm đến lớp 12: ${yearsToGrad12} năm
- Trường đang học: ${currentContext.schoolName || 'Chưa cung cấp'}
- Loại trường: ${schoolType}
- Xếp loại hiện tại: ${currentContext.currentPerformance || 'Chưa xác định'}

## 2. Năng lực học thuật
- Điểm năng lực trung bình: ${avgAcademic}/10
- Môn mạnh (≥7/10): ${strengths.join(', ') || 'Chưa xác định'}
- Môn cần cải thiện (≤4/10): ${weaknesses.join(', ') || 'Không có'}
- Trình độ tiếng Anh: ${currentContext.englishLevel || 'Chưa đánh giá'}
- Phong cách học: ${LEARNING_STYLES[studentContext.learningStyle]?.name}

## 3. Điểm nổi bật & Thách thức
- Năng khiếu: ${studentContext.talents?.join(', ') || 'Chưa xác định'}
- Thành tích: ${studentContext.achievements?.join(', ') || 'Chưa có'}
- Sở thích/Đam mê: ${studentContext.interests?.join(', ') || 'Chưa xác định'}
- Khó khăn: ${studentContext.challenges?.join(', ') || 'Không có'}
- Điểm độc đáo: ${familyAspirations.developmentFocus?.uniqueStrengths?.join(', ') || 'Chưa xác định'}

## 4. Mục tiêu gia đình
- Mục tiêu cuối cùng: HỌC BỔNG TOÀN PHẦN đại học TOP 5 ÚC
- Trường ĐH mục tiêu: ${familyAspirations.academicGoals?.targetUniversity || 'Top 5 Australia'}
- Ngành học: ${familyAspirations.academicGoals?.targetMajor || 'Chưa xác định'}
- Nghề nghiệp: ${familyAspirations.academicGoals?.targetCareer || 'Chưa xác định'}
- Yêu cầu học bổng: ${financialCapacity}

## 5. Nguồn lực gia đình
- Thời gian học/ngày: ${familyAspirations.resources?.studyTimePerDay || 3}h
- Mức độ hỗ trợ phụ huynh: ${familyAspirations.resources?.parentInvolvement || 'medium'}
- Khả năng tài chính du học: ${familyAspirations.resources?.studyAbroadBudget || 'Phụ thuộc học bổng'}

═══════════════════════════════════════════════════════════════════
🎯 YÊU CẦU PHÂN TÍCH (5 GÓC NHÌN CHUYÊN GIA)
═══════════════════════════════════════════════════════════════════

### 👨‍🎓 GÓC NHÌN 1: CHUYÊN GIA DU HỌC ÚC (Australian Education Consultant)
Đánh giá từ góc độ chuyên gia tư vấn du học Úc với 15+ năm kinh nghiệm:
- Yêu cầu thực tế của Top 5 Úc (Melbourne, Sydney, UNSW, ANU, Monash)
- Học bổng khả dụng: chính phủ Úc, chính phủ VN, scholarship từ trường
- Timeline apply học bổng (khi nào bắt đầu, deadline quan trọng)
- Hồ sơ cạnh tranh cần những gì? (GPA, IELTS, extracurriculars, essays)
- So sánh con đường: Direct entry vs Foundation/Pathway

### 👨‍🏫 GÓC NHÌN 2: CHUYÊN GIA PHÁT TRIỂN TOÀN DIỆN (Holistic Development)
Đánh giá phát triển 3 trụ cột theo giai đoạn:

**Tiểu học (Lớp 1-5):** Trọng số: Học thuật 30% | Kỹ năng mềm 40% | Nhân cách 30%
- Focus: Nền tảng Toán-Anh, yêu thích học tập, tò mò khám phá

**THCS (Lớp 6-9):** Trọng số: Học thuật 40% | Kỹ năng mềm 35% | Nhân cách 25%
- Focus: Academic excellence, IELTS 6.0+, leadership, critical thinking

**THPT (Lớp 10-12):** Trọng số: Học thuật 50% | Kỹ năng mềm 30% | Nhân cách 20%
- Focus: GPA 8.5+, IELTS 7.5+, research, unique story, impact

### 👨‍👩‍👧 GÓC NHÌN 3: PHÂN TÍCH BỐI CẢNH THỰC TẾ (Current Context)
Đánh giá dựa trên:
- Trường đang học có phù hợp với mục tiêu không?
- Khoảng cách giữa năng lực hiện tại và yêu cầu top 5 Úc
- Khả năng tài chính của gia đình - chiến lược học bổng phù hợp
- Nguồn lực có sẵn (thời gian, người hỗ trợ, mạng lưới)
- Rủi ro và cách giảm thiểu

### 👨‍🔬 GÓC NHÌN 4: CHUYÊN GIA TIỀM NĂNG CON NGƯỜI (Human Potential)
Đánh giá từ góc độ tâm lý học phát triển và IKIGAI:
- Điểm mạnh bẩm sinh (What you're good at)
- Đam mê thực sự (What you love)
- Thế giới cần gì từ con? (What the world needs)
- Con có thể làm nghề gì? (What you can be paid for)
- Động lực nội tại vs áp lực bên ngoài
- Stress tolerance và resilience
- Unique story tiềm năng cho application

### 📝 GÓC NHÌN 5: PROFILE BUILDER (Scholarship Application)
Đánh giá hồ sơ theo chuẩn admission top 5 Úc:

**Academic Profile:**
- GPA requirement: 8.5+/10 (thực tế 9.0+ để cạnh tranh)
- English: IELTS 7.0-7.5+ hoặc PTE 65+
- Standardized tests: SAT (nếu cần)

**Extracurricular Profile (SPIKE approach):**
- Một lĩnh vực XUẤT SẮC (spike) quan trọng hơn giỏi đều
- Leadership evidence (không chỉ title, mà impact)
- Community service (sustained commitment, measurable impact)
- Awards & Recognition (Olympic, competitions)

**Personal Story:**
- Unique angle - điều gì làm con khác biệt?
- Growth narrative - con đã vượt qua khó khăn gì?
- Vision & Goals - con muốn đóng góp gì cho thế giới?

═══════════════════════════════════════════════════════════════════
📊 OUTPUT FORMAT (JSON)
═══════════════════════════════════════════════════════════════════

{
  "expertAssessment": {
    "australiaExpert": {
      "scholarshipReadiness": "not_ready|early_stage|developing|competitive|highly_competitive",
      "feasibilityPercent": number,
      "primaryPathway": "direct_entry|foundation|pathway_program",
      "targetScholarships": ["string"],
      "criticalGaps": ["string"],
      "timelineAlert": "string"
    },
    "holisticDevelopment": {
      "academicScore": number,
      "softSkillsScore": number,
      "characterScore": number,
      "currentStageBalance": "balanced|academic_heavy|soft_skills_heavy|needs_rebalance",
      "stagePriorities": {
        "immediate": { "academic": number, "softSkills": number, "character": number },
        "nextStage": { "academic": number, "softSkills": number, "character": number }
      }
    },
    "contextAnalysis": {
      "schoolFit": "excellent|good|adequate|poor",
      "resourceAdequacy": "sufficient|needs_supplement|insufficient",
      "financialStrategy": "string",
      "riskLevel": "low|medium|high",
      "riskFactors": ["string"]
    },
    "humanPotential": {
      "innateStrengths": ["string"],
      "passionAlignment": "clear|emerging|unclear",
      "ikigaiInsight": "string",
      "motivationType": "intrinsic|extrinsic|mixed",
      "uniqueAngle": "string",
      "burnoutRisk": "low|medium|high"
    },
    "profileGaps": {
      "academicGaps": ["string"],
      "extracurricularGaps": ["string"],
      "storyGaps": ["string"],
      "overallReadiness": number
    }
  },
  "pathOptions": [
    {
      "id": "path_1",
      "name": "string",
      "targetUni": "melbourne|sydney|unsw|anu|monash",
      "scholarshipType": "government|university|foundation",
      "description": "string",
      "suitabilityPercent": number,
      "pros": ["string"],
      "cons": ["string"],
      "requirements": ["string"],
      "timeline": "string"
    }
  ],
  "developmentRoadmap": {
    "elementary": {
      "academicFocus": ["string"],
      "softSkillsFocus": ["string"],
      "characterFocus": ["string"],
      "activities": ["string"],
      "milestones": ["string"],
      "parentRole": "string"
    },
    "middle": {
      "academicFocus": ["string"],
      "softSkillsFocus": ["string"],
      "characterFocus": ["string"],
      "activities": ["string"],
      "milestones": ["string"],
      "englishTarget": "string",
      "competitionsTarget": ["string"]
    },
    "high": {
      "academicFocus": ["string"],
      "softSkillsFocus": ["string"],
      "characterFocus": ["string"],
      "activities": ["string"],
      "milestones": ["string"],
      "applicationTimeline": {
        "grade10": ["string"],
        "grade11": ["string"],
        "grade12": ["string"]
      }
    }
  },
  "immediateActions": {
    "next30days": ["string"],
    "next3months": ["string"],
    "next6months": ["string"],
    "parentActions": ["string"]
  },
  "warningsAndRisks": {
    "criticalWarnings": ["string"],
    "commonMistakes": ["string"],
    "planBOptions": ["string"]
  }
}

Trả lời bằng tiếng Việt, format JSON theo cấu trúc trên.
`;

  return prompt;
}

/**
 * Call AI service for analysis
 * Uses unified AI Provider with auto fallback
 */
export async function analyzeWithAI(prompt) {
  try {
    // Dynamic import to avoid circular dependency
    const { aiProvider } = await import('./ai/index.js');

    // Check if AI Provider is initialized
    const status = aiProvider.getStatus();
    if (!status.initialized) {
      return {
        error: 'AI chưa được khởi tạo. Vui lòng đăng nhập lại.'
      };
    }

    if (status.availableProviders.length === 0) {
      return {
        error: 'Chưa có AI provider khả dụng. Vào Cài đặt AI để cấu hình.'
      };
    }

    // Call AI with roadmap_analysis task type for smart routing
    const response = await aiProvider.chat({
      task: 'roadmap_analysis',
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 4096,
      temperature: 0.7
    });

    if (!response.success) {
      return { error: response.error?.message || 'AI request failed' };
    }

    const text = response.content;
    if (!text) {
      return { error: 'Không nhận được phản hồi từ AI' };
    }

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return { error: 'Không thể parse phản hồi AI', rawText: text };

  } catch (error) {
    console.error('AI analysis error:', error);

    // Handle quota exceeded
    if (error.code === 'QUOTA_EXCEEDED') {
      return {
        error: `${error.message}. Hãy thêm API key của bạn trong Cài đặt AI.`
      };
    }

    return { error: error.message || 'Lỗi không xác định' };
  }
}

// ============================================
// AI RECOMMENDATION (Save/Load)
// ============================================

export async function saveAIRecommendation(userId, childId, recommendation) {
  const data = {
    ...recommendation,
    createdAt: new Date().toISOString()
  };

  if (!db || !userId) {
    localStorage.setItem(`sumSched_${childId}_aiRecommendation`, JSON.stringify(data));
    return true;
  }

  try {
    await set(ref(db, `aiRecommendations/${userId}/${childId}`), data);
    return true;
  } catch (error) {
    console.error('Error saving AI recommendation:', error);
    return false;
  }
}

export async function getAIRecommendation(userId, childId) {
  if (!db || !userId) {
    const stored = localStorage.getItem(`sumSched_${childId}_aiRecommendation`);
    return stored ? JSON.parse(stored) : null;
  }

  try {
    const snapshot = await get(ref(db, `aiRecommendations/${userId}/${childId}`));
    return snapshot.exists() ? snapshot.val() : null;
  } catch (error) {
    console.error('Error getting AI recommendation:', error);
    return null;
  }
}

// ============================================
// 12-YEAR ROADMAP (Step 4)
// ============================================

export async function saveRoadmap(userId, childId, roadmap) {
  const data = {
    ...roadmap,
    updatedAt: new Date().toISOString()
  };

  if (!db || !userId) {
    localStorage.setItem(`sumSched_${childId}_roadmap`, JSON.stringify(data));
    return true;
  }

  try {
    await set(ref(db, `roadmaps/${userId}/${childId}`), data);
    return true;
  } catch (error) {
    console.error('Error saving roadmap:', error);
    return false;
  }
}

export async function getRoadmap(userId, childId) {
  if (!db || !userId) {
    const stored = localStorage.getItem(`sumSched_${childId}_roadmap`);
    return stored ? JSON.parse(stored) : null;
  }

  try {
    const snapshot = await get(ref(db, `roadmaps/${userId}/${childId}`));
    return snapshot.exists() ? snapshot.val() : null;
  } catch (error) {
    console.error('Error getting roadmap:', error);
    return null;
  }
}

/**
 * Generate roadmap from AI recommendation
 */
export function generateRoadmapFromRecommendation(recommendation, selectedPathId, currentGrade) {
  const selectedPath = recommendation.pathOptions.find(p => p.id === selectedPathId);
  if (!selectedPath) return null;

  const roadmap = {
    id: `roadmap_${Date.now()}`,
    selectedPathId,
    selectedPathName: selectedPath.name,
    ultimateGoal: selectedPath.description,
    createdAt: new Date().toISOString(),

    phases: {
      elementary: {
        grades: [1, 2, 3, 4, 5].filter(g => g >= currentGrade && g <= 5),
        focus: recommendation.milestones?.elementary?.focus || '',
        subjects: recommendation.milestones?.elementary?.subjects || [],
        skills: recommendation.milestones?.elementary?.skills || [],
        activities: recommendation.milestones?.elementary?.activities || []
      },
      middle: {
        grades: [6, 7, 8, 9],
        focus: recommendation.milestones?.middle?.focus || '',
        subjects: recommendation.milestones?.middle?.subjects || [],
        skills: recommendation.milestones?.middle?.skills || [],
        activities: recommendation.milestones?.middle?.activities || []
      },
      high: {
        grades: [10, 11, 12],
        focus: recommendation.milestones?.high?.focus || '',
        subjects: recommendation.milestones?.high?.subjects || [],
        skills: recommendation.milestones?.high?.skills || [],
        activities: recommendation.milestones?.high?.activities || []
      }
    },

    immediateActions: recommendation.immediateActions || [],
    assessment: recommendation.assessment
  };

  return roadmap;
}

// ============================================
// EXPORTS
// ============================================

export default {
  initStrategicPlanning,
  // Constants - Basic
  SUBJECT_LEVELS,
  SKILL_LEVELS,
  LEARNING_STYLES,
  ACADEMIC_PRIORITIES,
  SUBJECTS_BY_LEVEL,
  SKILLS,
  // Constants - Enhanced for Australia Scholarship
  SCHOOL_TYPES,
  CURRICULUM_TYPES,
  FINANCIAL_CAPACITY,
  DEVELOPMENT_STAGES,
  TOP_5_AUSTRALIA_UNIS,
  ENGLISH_LEVELS,
  ACHIEVEMENT_CATEGORIES,
  ACHIEVEMENT_LEVELS,
  ACTIVITY_DEPTH,
  POPULAR_COMPETITIONS,
  LEARNING_CENTERS,
  SELF_LEARNING_APPS,
  STAGE_RESOURCE_RECOMMENDATIONS,
  // Dynamic Data Loading
  fetchSchoolsData,
  getSchoolsByLevel,
  getSchoolById,
  searchSchools,
  fetchLearningResources,
  refreshAllExternalData,
  getResourcesForStage,
  getDataStatus,
  // Student Context
  createEmptyStudentContext,
  saveStudentContext,
  getStudentContext,
  // Family Aspirations
  createEmptyFamilyAspirations,
  saveFamilyAspirations,
  getFamilyAspirations,
  // AI Analysis
  generateAnalysisPrompt,
  analyzeWithAI,
  saveAIRecommendation,
  getAIRecommendation,
  // Roadmap
  saveRoadmap,
  getRoadmap,
  generateRoadmapFromRecommendation
};
