import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateStoneDataTable1756889499854 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: "stonedata",
                columns: [
                    {
                        name: "id",
                        type: "serial",
                        isPrimary: true,
                    },
                    {
                        name: "certficate_no",
                        type: "varchar",
                        length: "100",
                        isNullable: false,
                    },
                    {
                        name: "shape",
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
                        name: "color",
                        type: "varchar",
                        length: "100",
                        isNullable: false,
                    },
                    {
                        name: "clarity",
                        type: "varchar",
                        length: "100",
                        isNullable: false,
                    },
                    {
                        name: "cut",
                        type: "varchar",
                        length: "100",
                        isNullable: false,
                    },
                    {
                        name: "depth",
                        type: "float",
                        isNullable: false,
                    },
                    {
                        name: "polish",
                        type: "varchar",
                        length: "100",
                        isNullable: false,
                    },
                    {
                        name: "symmetry",
                        type: "varchar",
                        length: "100",
                        isNullable: false,
                    },
                    {
                        name: "fluorescence",
                        type: "varchar",
                        length: "100",
                        isNullable: false,
                    },
                    {
                        name: "girdle",
                        type: "varchar",
                        length: "100",
                        isNullable: false,
                    },
                    {
                        name: "table",
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
                        name: "created_at",
                        type: "timestamp",
                        default: "CURRENT_TIMESTAMP",
                        isNullable: false,
                    },
                    {
                        name: "updated_at",
                        type: "timestamp",
                        default: "CURRENT_TIMESTAMP",
                        isNullable: false,
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
        await queryRunner.dropTable("stonedata");
    }

}
