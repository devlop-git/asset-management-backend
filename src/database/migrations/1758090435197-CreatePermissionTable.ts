import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreatePermissionTable1758090435197 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: "permissions",
                columns: [
                    {
                        name: "id",
                        type: "int",
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: "increment",
                    },
                    {
                        name: "url",
                        type: "varchar",
                        length: "255",
                        isNullable: false,
                    },
                    {
                        name: "method",
                        type: "varchar",
                        length: "100",
                        isNullable: false,
                    },
                    {
                        name: "description",
                        type: "text",
                        isNullable: true,
                    },
                    {
                        name: "is_active",
                        type: "smallint",
                        isNullable: false,
                        default: 1,
                        comment: "0: inactive, 1: active",
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
                ],
                uniques: [
                    {
                        name: "UQ_permissions_url_method",
                        columnNames: ["url", "method"],
                    },
                ],
            }),
            true
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("permissions");
    }

}
