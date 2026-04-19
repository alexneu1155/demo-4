import "reflect-metadata";
import { DataSource } from "typeorm";

export const AppDataSource = new DataSource({
    type: "mariadb", 
    host: "localhost",
    port: 3306,
    username: "your_username",
    password: "your_password",
    database: "qa_metrics_db",
    logging: false,
});

export const initDB = async () => {
    if (!AppDataSource.isInitialized) {
        try {
            await AppDataSource.initialize();
            console.log("MariaDB connection established successfully.");
        } catch (error) {
            console.error("Error during Data Source initialization:", error);
            throw error;
        }
    }
};