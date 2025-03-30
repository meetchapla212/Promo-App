var mysql = require("mysql2");
const moment = require("moment");
const dateFormat = "YYYY-MM-DD HH:mm:ss";
var conn;

module.exports = class DBManager {
    mysql_real_escape_string(str) {
        return str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, function (char) {
            switch (char) {
                case "\0":
                    return "\\0";
                case "\x08":
                    return "\\b";
                case "\x09":
                    return "\\t";
                case "\x1a":
                    return "\\z";
                case "\n":
                    return "\\n";
                case "\r":
                    return "\\r";
                case '"':
                case "'":
                case "\\":
                case "%":
                    return "\\" + char; // prepends a backslash to backslash, percent,
                // and double/single quotes
                default:
                    return char;
            }
        });
    }

    async connectDatabase() {
        var pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            waitForConnections: true,
            connectTimeout: 60000,
        });

        return new Promise((resolve, reject) => {
            pool.getConnection(function (err, connectDB) {
                if(err){
                    console.log("mysqlErrorConection", err);
                    reject(err);
                } else{
                    conn = connectDB;
                    resolve(conn);
                }
            });
        });
    }

    async runQuery(sqlQry, logResponse = true) {
        if(!conn){
            console.log('Not Connected');
            await this.connectDatabase();
        }
        
        if(!conn){
            console.log('Again Not Connected');
            await this.connectDatabase();
        }

        return new Promise((resolve, reject) => {
            conn.query(sqlQry, function (error, results, fields) {
                // pool.releaseConnection(conn);
                if (error) {
                    console.log("mysqlError", error);
                    reject(error);
                } else {
                    if (logResponse) console.log("response===>Query", results);
                    conn.query("FLUSH HOST;", function (error, results, fields) {
                        console.log("flush host");
                    });
                    resolve(results);
                }
            });
        });
    }

    async runQuery_oldBackup(sqlQry, logResponse = true) {
        if (logResponse) console.log("====sqlQry>>>>>>", sqlQry);
        var pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            waitForConnections: true,
            connectTimeout: 60000,
        });

        return new Promise((resolve, reject) => {
            pool.getConnection(function (error, conn) {
                if(error){
                    console.error("error : ", error);
                    reject(error);
                }
                if(conn){
                    // conn.query('FLUSH HOST');
                    conn.query(sqlQry, function (error, results, fields) {
                        pool.releaseConnection(conn);
                        if (error) {
                            console.log("mysqlError", error);
                            reject(error);
                        } else {
                            if (logResponse) console.log("response===>Query", results);
                            conn.query("FLUSH HOST;", function (error, results, fields) {
                                console.log("flush host");
                            });
                            resolve(results);
                        }
                    });
                } else {
                    reject("Server error! Please try again later");
                }
            });
        });
    }

    async dataInsert(tableName, value) {
        value.date_created = moment().format(dateFormat);
        console.log("inser data------>>", value);
        const fields = Object.keys(value).map((key) => `${key}`).join(",");
        const values = Object.values(value).map((value) => {
            return typeof value === "string" ? `'${this.mysql_real_escape_string(value)}'` : `${value}`;
        }).join(",");

        var sqlQry = "INSERT INTO " + tableName + " (" + fields + ") values (" + values + ") ";
        console.log(sqlQry);
        return new Promise((resolve, reject) => {
            this.runQuery(sqlQry).then((data) => {
                resolve(data);
            }).catch((error) => {
                reject(error);
            });
        });
    }

    async dataUpdate(tableName, dataObj, whereObj = {}, condition = "AND") {
        dataObj.date_modified = moment().format(dateFormat);
        var _self = this;
        const fieldsName = Object.keys(dataObj).map(function (key, index) {
            var value = typeof dataObj[key] === "string" ? `"${_self.mysql_real_escape_string(dataObj[key])}"` : `${dataObj[key]}`;
            return `${key} = ${value}`;
        }).join(",");

        const wheryQry = Object.keys(whereObj).map(function (key, index) {
            var value = typeof whereObj[key] === "string" ? `'${whereObj[key]}'` : `${whereObj[key]}`;
            return `${key} = ${value}`;
        }).join(" " + condition + " ");

        var sqlQry = `UPDATE ${tableName} SET  ${fieldsName}`;
        if (Object.keys(whereObj).length > 0) {
            sqlQry += " WHERE " + wheryQry;
        }
        console.log("update query", sqlQry);
        return new Promise((resolve, reject) => {
            this.runQuery(sqlQry).then((data) => {
                resolve(data);
            }).catch((error) => {
                reject(error);
            });
        });
    }

    async getData(
        tableName,
        fieldsObj = "*",
        whereObj = {},
        condition = "AND",
        offset = -1,
        limit = -1,
        customWhere = "",
        orderBy = ""
    ) {
        const wheryQry = Object.keys(whereObj).map(function (key, index) {
            var value = typeof whereObj[key] === "string" ? `'${whereObj[key]}'` : `${whereObj[key]}`;
            return `${key} = ${value}`;
        }).join(" " + condition + " ");

        var sqlQry = "SELECT " + fieldsObj + " FROM " + tableName;
        if (Object.keys(whereObj).length > 0) {
            sqlQry += " WHERE (" + wheryQry + ")";
            sqlQry += " AND is_deleted = 0";
        } else {
            sqlQry += " WHERE is_deleted = 0";
        }
        if (customWhere != "") {
            sqlQry += " AND " + customWhere;
        }
        if (orderBy == "") {
            sqlQry += " ORDER BY date_created DESC";
        } else {
            sqlQry += " " + orderBy;
        }
        if (offset >= 0 && limit >= 0) {
            sqlQry += ` LIMIT ${offset},${limit}`;
        }

        return new Promise((resolve, reject) => {
            this.runQuery(sqlQry).then((data) => {
                resolve(data);
            }).catch((error) => {
                reject(error);
            });
        });
    }

    async dataDelete(tableName, whereObj = {}, condition = "AND") {
        const wheryQry = Object.keys(whereObj).map(function (key, index) {
            var value = typeof whereObj[key] === "string" ? `'${whereObj[key]}'` : `${whereObj[key]}`;
            return `${key} = ${value}`;
        }).join(" " + condition + " ");

        var sqlQry = "UPDATE " + tableName + " SET is_deleted = 1";
        if (Object.keys(whereObj).length > 0) {
            sqlQry += " WHERE " + wheryQry;
        }
        console.log(sqlQry);
        return new Promise((resolve, reject) => {
            this.runQuery(sqlQry).then((data) => {
                resolve(data);
            }).catch((error) => {
                reject(error);
            });
        });
    }

    async getJoinedData(
        tableName1,
        tableName2,
        table1ColumnName,
        table2ColumnName,
        fieldsObj = "*",
        whereObj = {},
        condition = "AND",
        offset = -1,
        limit = -1,
        customWhere = "",
        orderBy = ""
    ) {
        const wheryQry = Object.keys(whereObj)
            .map(function (key, index) {
                var value = typeof whereObj[key] === "string" ? `'${whereObj[key]}'` : `${whereObj[key]}`;
                return `${key} = ${value}`;
            })
            .join(" " + condition + " ");

        var sqlQry =
            "SELECT " +
            fieldsObj +
            " FROM " +
            tableName1 +
            " JOIN " +
            tableName2 +
            " ON " +
            `${tableName1}.${table1ColumnName}` +
            " = " +
            `${tableName2}.${table2ColumnName}`;
        if (Object.keys(whereObj).length > 0) {
            sqlQry += " WHERE (" + wheryQry + ")";
            sqlQry += ` AND ${tableName1}.is_deleted = 0 AND ${tableName2}.is_deleted = 0`;
        } else {
            sqlQry += ` WHERE ${tableName1}.is_deleted = 0 AND ${tableName2}.is_deleted = 0`;
        }
        if (customWhere != "") {
            sqlQry += " AND " + customWhere;
        }
        if (orderBy != "") {
            sqlQry += orderBy;
        } else {
            sqlQry += " ORDER BY " + tableName1 + ".date_created DESC";
        }
        if (offset >= 0 && limit >= 0) {
            sqlQry += ` LIMIT ${offset},${limit}`;
        }
        return new Promise((resolve, reject) => {
            this.runQuery(sqlQry).then((data) => {
                resolve(data);
            }).catch((error) => {
                reject(error);
            });
        });
    }

    async searchData(tableName, fieldsObj = "*", whereObj = {}, condition = "OR", offset = -1, limit = -1) {
        const whereQry = Object.keys(whereObj).map(function (key, index) {
            return `${key} LIKE  '%${whereObj[key]}%'`;
        }).join(" " + condition + " ");

        var sqlQry = "SELECT " + fieldsObj + " FROM " + tableName;
        if (Object.keys(whereObj).length > 0) {
            sqlQry += " WHERE (" + whereQry + ")";
            sqlQry += " AND is_deleted = 0";
        } else {
            sqlQry += " WHERE is_deleted = 0";
        }
        if (offset >= 0 && limit >= 0) {
            sqlQry += ` LIMIT ${offset},${limit}`;
        }
        console.log(sqlQry);
        return new Promise((resolve, reject) => {
            this.runQuery(sqlQry).then((data) => {
                resolve(data);
            }).catch((error) => {
                reject(error);
            });
        });
    }

    async getLimitData(tableName, fieldsObj = "*", offset, limit) {
        var sqlQry = "SELECT " + fieldsObj + " FROM " + tableName + " LIMIT " + limit + " OFFSET " + offset;
        return new Promise((resolve, reject) => {
            this.runQuery(sqlQry)
                .then((data) => {
                    resolve(data);
                })
                .catch((error) => {
                    reject(error);
                });
        });
    }

    async countRecord(tableName) {
        var sqlQry = "SELECT  COUNT(*) as total FROM " + tableName;
        return new Promise((resolve, reject) => {
            this.runQuery(sqlQry).then((data) => {
                resolve(data);
            }).catch((error) => {
                reject(error);
            });
        });
    }
    async bulkInsert(tableName, bulkArray) {
        let values = [];
        let fields = "";
        console.log(typeof bulkArray);
        await Promise.all(
            bulkArray.map((value) => {
                value.date_created = moment().format(dateFormat);
                fields = Object.keys(value).map((key) => `${key}`).join(",");
                values.push(
                    Object.values(value).map((objvalue) => {
                        return typeof objvalue === "string" ? `"${this.mysql_real_escape_string(objvalue)}"` : `${objvalue}`;
                    }).join(",")
                );
                return values;
            })
        ).then((returnQueryData) => {
            console.log("returnQueryData===>", returnQueryData);
        });
        values = "(" + values.join("),(") + ")";
        var sqlQry = "INSERT INTO " + tableName + " (" + fields + ") values " + values;
        console.log(sqlQry);
        return new Promise(async (resolve, reject) => {
            await this.runQuery(sqlQry).then((data) => {
                resolve(data);
            }).catch((error) => {
                reject(error);
            });
        });
    }
};