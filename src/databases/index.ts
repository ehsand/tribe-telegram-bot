import { DB_HOST, DB_NAME } from "@config";

export const dbConnection = DB_HOST && {
  url: DB_HOST,
  options: {
    dbName: DB_NAME,
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
  },
};
