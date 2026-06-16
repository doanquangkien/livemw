export default function ContactTab() {
  return (
    <div className="space-y-6">
      {/* Intro */}
      <div className="p-5 bg-gray-900 border border-gray-800">
        <h2 className="text-lg font-bold text-white mb-2">Liên Hệ Trại Gà Chúc Cát Tường</h2>
        <p className="text-sm text-gray-400 leading-relaxed">
          Anh em có nhu cầu giao lưu, trao đổi kinh nghiệm chăm sóc chiến kê hoặc cần hỗ trợ tư vấn, vui lòng liên hệ trực tiếp qua các kênh chính thức dưới đây.
        </p>
      </div>

      {/* Contact Methods */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Phone / Zalo */}
        <a 
          href="tel:0909999999" 
          className="flex items-center gap-4 p-4 bg-gray-900/50 border border-gray-800 hover:bg-gray-800 transition-colors"
        >
          <div className="p-3 bg-blue-500/10 shrink-0">
            <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Hotline / Zalo</h3>
            <p className="text-sm text-gray-400 mt-1">09xx.xxx.xxx</p>
          </div>
        </a>

        {/* Facebook */}
        <a 
          href="#" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-4 p-4 bg-gray-900/50 border border-gray-800 hover:bg-gray-800 transition-colors"
        >
          <div className="p-3 bg-blue-600/10 shrink-0">
            <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Fanpage Facebook</h3>
            <p className="text-sm text-gray-400 mt-1">Trại Gà Chúc Cát Tường</p>
          </div>
        </a>

        {/* Location */}
        <div className="flex items-center gap-4 p-4 bg-gray-900/50 border border-gray-800 md:col-span-2">
          <div className="p-3 bg-red-500/10 shrink-0">
            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Địa chỉ trại</h3>
            <p className="text-sm text-gray-400 mt-1">Vui lòng liên hệ trước khi đến tham quan.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
