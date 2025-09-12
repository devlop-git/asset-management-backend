import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateStockTable1756889510922 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: "stock",
                columns: [
                    {
                        name: "id",
                        type: "serial",
                        isPrimary: true,
                    },
                    {
                        name: "stock",
                        type: "varchar",
                        length: "100",
                        isNullable: false,
                    },
                    {
                        name: "orderid",
                        type: "varchar",
                        length: "100",
                        isNullable: false,
                    },
                    {
                        name: "tag_no",
                        type: "varchar",
                        length: "100",
                        isNullable: false,
                    },
                    {
                        name: "status",
                        type: "varchar",
                        length: "100",
                        isNullable: false,
                    },
                    {
                        name: "certificate_no",
                        type: "varchar",
                        length: "100",
                        isNullable: false,
                    },
                    {
                        name: "order_received_date",
                        type: "timestamp",
                        isNullable: false,
                    },
                    {
                        name: "diamond_received_date",
                        type: "timestamp",
                        isNullable: false,
                    },
                    {
                        name: "purity_name",
                        type: "varchar",
                        length: "100",
                        isNullable: false,
                    },
                    {
                        name: "avg_weight",
                        type: "float8",
                        isNullable: false,
                    },
                    {
                        name: "pieces",
                        type: "integer",
                        isNullable: false,
                    },
                    {
                        name: "stone_type",
                        type: "varchar",
                        length: "100",
                        isNullable: false,
                    },
                    {
                        name: "lab",
                        type: "varchar",
                        length: "100",
                        isNullable: false,
                    },
                    {
                        name: "supplier",
                        type: "varchar",
                        length: "100",
                        isNullable: false,
                    },
                    {
                        name: "dfr_supplier",
                        type: "varchar",
                        length: "100",
                        isNullable: false,
                    },
                    {
                        name: "dfr_vendor",
                        type: "varchar",
                        length: "100",
                        isNullable: false,
                    },
                    {
                        name: "dfr_cert",
                        type: "varchar",
                        length: "100",
                        isNullable: false,
                    },
                    {
                        name: "dfr_shape",
                        type: "varchar",
                        length: "100",
                        isNullable: false,
                    },
                    {
                        name: "dfr_color",
                        type: "varchar",
                        length: "100",
                        isNullable: false,
                    },
                    {
                        name: "dfr_clarity",
                        type: "varchar",
                        length: "100",
                        isNullable: false,
                    },
                    {
                        name: "dfr_carat",
                        type: "varchar",
                        length: "100",
                        isNullable: false,
                    },
                    {
                        name: "dfr_cut",
                        type: "varchar",
                        length: "100",
                        isNullable: false,
                    },
                    {
                        name: "dfr_polish",
                        type: "varchar",
                        length: "100",
                        isNullable: false,
                    },
                    {
                        name: "dfr_symmetry",
                        type: "varchar",
                        length: "100",
                        isNullable: false,
                    },
                    {
                        name: "measurement",
                        type: "varchar",
                        length: "100",
                        isNullable: false,
                    },
                    {
                        name: "is_certified_stone",
                        type: "boolean",
                        isNullable: false,
                    },
                    {
                        name: "created_at",
                        type: "timestamp",
                        default: "CURRENT_TIMESTAMP",
                    },
                    {
                        name: "updated_at",
                        type: "timestamp",
                        default: "CURRENT_TIMESTAMP",
                    },
                    {
                        name: "is_active",
                        type: "boolean",
                        isNullable: false,
                    },
                ],
            }),
            true
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("stock");
    }

}
