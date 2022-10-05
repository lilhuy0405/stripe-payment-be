import "reflect-metadata"
import { DataSource } from "typeorm"
import { User } from "./entity/User"
import 'dotenv/config';
export const AppDataSource = new DataSource({
    type: "postgres",
    host: process.env.LOCAL_DATABASE_HOS,
    port: +process.env.LOCAL_DATABASE_PORT,
    username: process.env.LOCAL_DATABASE_USER,
    password: process.env.LOCAL_DATABASE_PASSWORD,
    database: process.env.LOCAL_DATABASE_NAME,
    synchronize: true,
    logging: false,
    entities: [User],
    migrations: [],
    subscribers: [],
    schema: process.env.LOCAL_DATABASE_SCHEMA,
})
