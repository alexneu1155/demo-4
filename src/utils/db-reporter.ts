import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Reporter, TestCase, TestResult as PlaywrightTestResult, FullConfig, Suite } from "@playwright/test/reporter";
import { AppDataSource, initDB } from "./db";


@Entity("test_results")
export class TestResult {
    // Chuyển sang dùng increment (hoặc để trống @PrimaryGeneratedColumn() mặc định sẽ là increment)
    @PrimaryGeneratedColumn("increment")
    id: number;

    @Column({ type: "varchar", length: 255, nullable: true })
    tag: string;

    @Column({ type: "varchar", length: 50 })
    result: string;

    @CreateDateColumn({ name: "created_at" })
    createdAt!: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt!: Date;
}


class DbReporter implements Reporter {
    async onBegin(config: FullConfig, suite: Suite) {
        // Khởi tạo kết nối DB trước khi toàn bộ test suite bắt đầu
        await initDB();
    }

    async onTestEnd(test: TestCase, result: PlaywrightTestResult) {
        try {
            const testResultRepo = AppDataSource.getRepository(TestResult);

            // Xử lý logic bóc tách tag từ tên test. 
            // Ví dụ title: "Checkout process works correctly @e2e @smoke"
            const tagsInTitle = test.title.match(/@\w+/g);
            const tag = tagsInTitle ? tagsInTitle.join(", ") : "no-tag";

            // Tạo record mới
            const newRecord = testResultRepo.create({
                tag: tag,
                result: result.status, 
            });

            // Lưu vào database
            await testResultRepo.save(newRecord);
            
        } catch (error) {
            console.error(`Failed to save test result for "${test.title}":`, error);
        }
    }

    async onEnd(result: any) {
        // Đóng kết nối an toàn khi chạy xong tất cả các test
        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
            console.log("Database connection closed.");
        }
    }
}

export default DbReporter;