
import React from 'react';
import { Logo } from './common/Logo';

const TermsOfServicePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-main-bg dark:bg-[#121212] font-sans text-text-primary dark:text-[#EAEAEA]">
      <header className="bg-surface/90 dark:bg-[#121212]/90 backdrop-blur-md border-b border-border-color dark:border-[#302839] sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.href = '/'}>
                <Logo className="w-8 h-8 text-[#7f13ec]" />
                <span className="font-bold text-lg text-text-primary dark:text-white">OPZEN AI</span>
            </div>
            <h1 className="font-semibold text-sm md:text-base text-text-secondary dark:text-gray-300">Điều khoản & Chính sách</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="prose dark:prose-invert max-w-none">
            <h1 className="text-3xl md:text-4xl font-extrabold mb-4 text-text-primary dark:text-white">CHÍNH SÁCH DỊCH VỤ VÀ ĐIỀU KHOẢN SỬ DỤNG</h1>
            <p className="text-sm text-text-secondary dark:text-gray-400 italic mb-10 border-b border-border-color dark:border-gray-800 pb-6">Cập nhật lần cuối: Tháng 10/2023</p>

            <div className="space-y-10 text-base leading-relaxed text-text-secondary dark:text-gray-300">
                <section>
                    <p className="mb-4">Chào mừng bạn đến với <strong>OPZEN AI</strong>. Khi đăng ký tài khoản và mua gói dịch vụ, bạn đồng ý tuân thủ hoàn toàn các điều khoản dưới đây.</p>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-text-primary dark:text-white mb-3">1. Định nghĩa</h2>
                    <ul className="list-disc pl-5 space-y-2">
                        <li><strong>"Dịch vụ":</strong> Là phần mềm AI hỗ trợ thiết kế kiến trúc, nội thất do chúng tôi cung cấp.</li>
                        <li><strong>"Credits" (Điểm tín dụng):</strong> Là đơn vị tiền tệ trong ứng dụng được sử dụng để đổi lấy các tác vụ AI (ví dụ: render ảnh, tạo phương án thiết kế).</li>
                        <li><strong>"Gói đăng ký" (Subscription):</strong> Là việc mua quyền truy cập và số lượng Credits nhất định theo chu kỳ (tháng/năm).</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-text-primary dark:text-white mb-3">2. Chính sách Thanh toán và Hoàn tiền (No Refund Policy)</h2>
                    <p className="mb-2">Đây là sản phẩm kỹ thuật số (Digital Product) và chi phí vận hành AI (Server/GPU) phát sinh ngay lập tức khi bạn sử dụng. Do đó, chúng tôi áp dụng chính sách <strong>KHÔNG HOÀN TIỀN</strong> nghiêm ngặt:</p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li><strong>Nguyên tắc chung:</strong> Tất cả các khoản thanh toán cho Gói đăng ký hoặc mua Credits lẻ đều là không hoàn lại (non-refundable) trong mọi trường hợp.</li>
                        <li><strong>Xác nhận mua hàng:</strong> Khi bạn bấm nút thanh toán, bạn xác nhận rằng bạn đã hiểu rõ tính năng sản phẩm và đồng ý từ bỏ quyền yêu cầu hoàn tiền (chargeback) qua ngân hàng hoặc cổng thanh toán.</li>
                        <li><strong>Ngoại lệ:</strong> Chúng tôi chỉ xem xét hoàn tiền trong trường hợp lỗi kỹ thuật nghiêm trọng xuất phát từ phía hệ thống của chúng tôi (ví dụ: bị trừ tiền nhưng không nhận được Credits) và lỗi này không thể khắc phục được trong vòng 72 giờ.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-text-primary dark:text-white mb-3">3. Quy định về Credits và Hạn sử dụng (Quan trọng)</h2>
                    <p className="mb-2">Hệ thống Credits của chúng tôi được thiết kế để duy trì tài nguyên máy chủ ổn định. Bạn cần lưu ý kỹ về hạn sử dụng:</p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li><strong>Cơ chế "Dùng hoặc Mất" (Use it or Lose it):</strong> Credits được cấp theo Gói đăng ký có thời hạn sử dụng tương ứng với chu kỳ của gói đó (ví dụ: Gói 1 tháng thì Credits có hạn 30 ngày).</li>
                        <li><strong>Hết hạn:</strong> Khi Gói đăng ký của bạn hết hạn hoặc đến ngày gia hạn tiếp theo:
                            <ul className="list-circle pl-5 mt-2 space-y-1 text-gray-500 dark:text-gray-400 text-sm">
                                <li>- Toàn bộ số Credits chưa sử dụng (còn dư) của chu kỳ trước sẽ bị hủy bỏ và thu hồi về 0.</li>
                                <li>- Số Credits dư này <strong>KHÔNG</strong> được cộng dồn (rollover) sang tháng tiếp theo.</li>
                                <li>- Số Credits dư này <strong>KHÔNG</strong> được quy đổi thành tiền mặt hoặc chuyển nhượng cho tài khoản khác.</li>
                            </ul>
                        </li>
                        <li><strong>Trách nhiệm người dùng:</strong> Bạn có trách nhiệm quản lý và sử dụng hết số Credits trong thời hạn hiệu lực. Chúng tôi không chịu trách nhiệm thông báo nhắc nhở về việc Credits sắp hết hạn.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-text-primary dark:text-white mb-3">4. Quyền Sở hữu Trí tuệ (Intellectual Property)</h2>
                    <ul className="list-disc pl-5 space-y-2">
                        <li><strong>Đầu ra (Output):</strong> Bạn sở hữu toàn quyền thương mại đối với các hình ảnh/thiết kế được tạo ra từ tài khoản của bạn sau khi đã thanh toán đầy đủ. Bạn có thể sử dụng chúng cho khách hàng, in ấn hoặc portfolio.</li>
                        <li><strong>Dữ liệu hệ thống:</strong> Chúng tôi sở hữu thuật toán, mã nguồn và giao diện phần mềm.</li>
                        <li><strong>Quyền sử dụng lại:</strong> Chúng tôi có quyền sử dụng các hình ảnh được tạo ra (nếu bạn sử dụng gói miễn phí hoặc chế độ công khai) để phục vụ mục đích quảng bá, marketing hoặc huấn luyện AI để cải thiện chất lượng dịch vụ. (Nếu bạn muốn bảo mật tuyệt đối, vui lòng mua gói Doanh nghiệp/Riêng tư).</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-text-primary dark:text-white mb-3">5. Tuyên bố miễn trừ trách nhiệm về Chuyên môn (Disclaimer)</h2>
                    <ul className="list-disc pl-5 space-y-2">
                        <li><strong>AI là công cụ hỗ trợ:</strong> OPZEN AI là công cụ AI hỗ trợ sáng tạo ý tưởng (ideation) và diễn họa. Các kết quả đầu ra (hình ảnh, bản vẽ) không thay thế cho hồ sơ kỹ thuật thi công, kết cấu hoặc tư vấn của Kiến trúc sư/Kỹ sư có chứng chỉ hành nghề.</li>
                        <li><strong>Tính chính xác:</strong> AI có thể tạo ra các chi tiết kiến trúc không khả thi về mặt vật lý hoặc xây dựng. Bạn hoàn toàn chịu trách nhiệm kiểm tra lại tính khả thi trước khi áp dụng vào thực tế. Chúng tôi không chịu trách nhiệm cho bất kỳ thiệt hại nào về công trình, chi phí thi công phát sinh do việc áp dụng trực tiếp hình ảnh AI vào xây dựng.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-text-primary dark:text-white mb-3">6. Chấm dứt dịch vụ</h2>
                    <p className="mb-2">Chúng tôi có quyền khóa tài khoản của bạn vĩnh viễn mà không cần hoàn tiền nếu phát hiện:</p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Sử dụng thẻ tín dụng đánh cắp.</li>
                        <li>Chia sẻ tài khoản cho nhiều người dùng chung (nếu gói không cho phép).</li>
                        <li>Sử dụng AI để tạo ra các nội dung vi phạm pháp luật, đồi trụy hoặc thù địch.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-text-primary dark:text-white mb-3">7. Thay đổi điều khoản</h2>
                    <p>Chúng tôi có quyền thay đổi giá cả và các điều khoản này bất cứ lúc nào. Các thay đổi sẽ được thông báo qua email hoặc ngay trên trang chủ. Việc bạn tiếp tục sử dụng dịch vụ sau khi thay đổi đồng nghĩa với việc bạn chấp nhận các điều khoản mới.</p>
                </section>

                {/* --- FAQ SECTION START --- */}
                <div className="pt-10 mt-12 border-t border-border-color dark:border-gray-700">
                    <h1 className="text-3xl font-bold mb-8 text-[#7f13ec]">CÂU HỎI THƯỜNG GẶP (FAQ)</h1>
                    
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-lg font-bold text-text-primary dark:text-white mb-2">1. Chính sách hoàn tiền của OPZEN AI hoạt động như thế nào?</h3>
                            <p className="leading-relaxed">
                                Vì OPZEN AI là sản phẩm kỹ thuật số và chi phí hạ tầng AI (máy chủ GPU) phát sinh ngay lập tức khi bạn kích hoạt tài khoản, chúng tôi áp dụng chính sách <strong>không hoàn tiền (no-refund)</strong> cho tất cả các gói dịch vụ đã mua. Chúng tôi khuyến khích bạn cân nhắc kỹ nhu cầu hoặc thử nghiệm (nếu có bản dùng thử) trước khi quyết định đăng ký gói trả phí.
                            </p>
                        </div>

                        <div>
                            <h3 className="text-lg font-bold text-text-primary dark:text-white mb-2">2. Số Credits còn dư của tháng này có được cộng dồn sang tháng sau không?</h3>
                            <p className="leading-relaxed">
                                <strong>Không.</strong> Cơ chế của chúng tôi là "Dùng hoặc Mất" (Use-it-or-lose-it). Khi chu kỳ thanh toán của bạn kết thúc (ví dụ: hết 1 tháng), hệ thống sẽ reset lại số Credits mới theo gói của bạn và hủy bỏ toàn bộ số Credits chưa sử dụng của tháng cũ. Việc này giúp chúng tôi duy trì được mức giá rẻ cho gói đăng ký bằng cách tối ưu hóa tài nguyên máy chủ dự trữ hàng tháng. Bạn hãy lưu ý sử dụng hết credits trước ngày hết hạn nhé!
                            </p>
                        </div>

                        <div>
                            <h3 className="text-lg font-bold text-text-primary dark:text-white mb-2">3. Tôi có quyền thương mại đối với các hình ảnh được tạo ra không?</h3>
                            <p className="leading-relaxed">
                                <strong>Có.</strong> Bạn có toàn quyền sở hữu và sử dụng các hình ảnh do bạn tạo ra cho mục đích thương mại (gửi khách hàng, in ấn, quảng cáo, làm portfolio...). Tuy nhiên, bạn chịu trách nhiệm về nội dung hình ảnh đó và đảm bảo không vi phạm luật pháp hiện hành.
                            </p>
                        </div>

                        <div>
                            <h3 className="text-lg font-bold text-text-primary dark:text-white mb-2">4. Tôi có thể hủy gia hạn gói đăng ký (Cancel Subscription) bất cứ lúc nào không?</h3>
                            <p className="leading-relaxed">
                                <strong>Chắc chắn rồi.</strong> Bạn có thể tắt tính năng "Tự động gia hạn" bất cứ lúc nào trong phần Cài đặt tài khoản. Sau khi hủy, bạn vẫn được tiếp tục sử dụng dịch vụ và số credits còn lại cho đến hết chu kỳ hiện tại. Sau khi hết chu kỳ đó, tài khoản sẽ không bị trừ tiền nữa và credits sẽ hết hạn. Lưu ý: Việc hủy gia hạn không đồng nghĩa với việc được hoàn lại tiền cho chu kỳ đang chạy.
                            </p>
                        </div>

                        <div>
                            <h3 className="text-lg font-bold text-text-primary dark:text-white mb-2">5. Hình ảnh AI tạo ra có chính xác tuyệt đối để thi công không?</h3>
                            <p className="leading-relaxed">
                                Công cụ của chúng tôi được thiết kế để hỗ trợ giai đoạn lên ý tưởng (Concept) và diễn họa (Visualization) nhanh chóng. Tuy nhiên, AI có thể tạo ra các chi tiết kiến trúc/nội thất chưa khả thi về mặt kết cấu hoặc kỹ thuật. Đây là công cụ hỗ trợ, không thay thế cho bản vẽ kỹ thuật chính xác. Bạn cần tham vấn chuyên môn Kiến trúc sư/Kỹ sư trước khi đưa vào thi công thực tế.
                            </p>
                        </div>

                        <div>
                            <h3 className="text-lg font-bold text-text-primary dark:text-white mb-2">6. Nếu tôi dùng hết Credits trước khi hết tháng thì sao?</h3>
                            <div className="leading-relaxed">
                                <p className="mb-2">Nếu bạn dùng hết Credits, bạn sẽ không thể tiếp tục tạo ảnh cho đến ngày gia hạn tiếp theo. Tuy nhiên, bạn hoàn toàn có thể:</p>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li>Mua thêm gói Credits nạp thêm (Top-up) để dùng ngay lập tức.</li>
                                    <li>Hoặc nâng cấp (Upgrade) lên gói cao hơn để có hạn mức lớn hơn cho tháng sau.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
                {/* --- FAQ SECTION END --- */}

            </div>
        </div>
      </main>
      
      <footer className="py-8 text-center text-sm text-text-secondary dark:text-gray-500 border-t border-border-color dark:border-gray-800">
        <p>&copy; 2025 OPZEN AI. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default TermsOfServicePage;
