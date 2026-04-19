import type {
  FullConfig, FullResult, Reporter, Suite, TestCase, TestResult
} from '@playwright/test/reporter';

class DiscordReporter implements Reporter {
  private passed = 0;
  private failed = 0;
  private skipped = 0;
  // Lấy webhook URL từ biến môi trường
  private webhookUrl = process.env.DISCORD_WEBHOOK_URL; 

  // Được gọi mỗi khi một test case chạy xong để gom số liệu
  onTestEnd(test: TestCase, result: TestResult) {
    if (result.status === 'passed') this.passed++;
    else if (result.status === 'failed' || result.status === 'timedOut') this.failed++;
    else if (result.status === 'skipped') this.skipped++;
  }

  // Được gọi khi toàn bộ suite đã chạy xong
  async onEnd(result: FullResult) {
    if (!this.webhookUrl) {
      console.warn('⚠️ Không tìm thấy biến môi trường DISCORD_WEBHOOK_URL. Bỏ qua việc gửi thông báo Discord.');
      return;
    }

    const mentions = this.getMentions(process.env.NOTIFIER);
    const total = this.passed + this.failed + this.skipped;
    const color = result.status === 'passed' ? 65280 : 16711680; // Xanh lá nếu pass hết, Đỏ nếu có lỗi
    const statusText = result.status === 'passed' ? '✅ PASSED' : '❌ FAILED';

    const payload = {
      // Content chính là nơi chứa tag người dùng để Discord có thể ping
      content: mentions ? `Hey ${mentions}, test run đã hoàn tất!` : 'Test run đã hoàn tất!',
      embeds: [
        {
          title: `Kết quả Playwright Test: ${statusText}`,
          description: `**Tổng cộng:** ${total}\n**Passed:** ${this.passed} ✅\n**Failed:** ${this.failed} ❌\n**Skipped:** ${this.skipped} ⏭️`,
          color: color,
          timestamp: new Date().toISOString()
        }
      ]
    };

    try {
      // Dùng fetch (có sẵn trong Node.js 18+) để gọi API
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        console.error(`❌ Lỗi khi gửi Discord message: ${response.statusText}`);
      } else {
        console.log('✅ Đã gửi report lên Discord thành công!');
      }
    } catch (error) {
      console.error('❌ Lỗi kết nối đến Discord webhook:', error);
    }
  }

  // Hàm xử lý logic biến NOTIFIER
  private getMentions(notifier?: string): string {
    if (!notifier) return '';
    let users: string[] = [];

    try {
      // Thử parse xem người dùng có truyền vào JSON array không (VD: '["123", "456"]')
      const parsed = JSON.parse(notifier);
      if (Array.isArray(parsed)) {
        users = parsed;
      } else {
        users = [notifier];
      }
    } catch {
      // Nếu parse JSON lỗi, tức là truyền string bình thường (VD: '123' hoặc '123, 456')
      // Tách ra bằng dấu phẩy
      users = notifier.split(',').map(s => s.trim()).filter(Boolean);
    }

    // Map các ID thành định dạng ping của Discord: <@USER_ID>
    return users.map(user => {
      // Đề phòng trường hợp người dùng đã truyền sẵn <@123>
      if (user.startsWith('<@') && user.endsWith('>')) return user;
      return `<@${user}>`;
    }).join(' ');
  }
}

export default DiscordReporter;