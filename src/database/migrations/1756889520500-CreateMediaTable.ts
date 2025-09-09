import { MigrationInterface, QueryRunner, Table, TableForeignKey } from "typeorm";

export class CreateMediaTable1756889520500 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: "media",
                columns: [
                    {
                        name: "id",
                        type: "int",
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: "increment",
                    },
                    {
                        name: "stone_id",
                        type: "int",
                        isNullable: false,
                        isUnique: true, // OneToOne relation
                    },
                    {
                        name: "image_url",
                        type: "text",
                        isNullable: true,
                    },
                    {
                        name: "is_image_original",
                        type: "boolean",
                        isNullable: false,
                    },
                    {
                        name: "video_url",
                        type: "text",
                        isNullable: true,
                    },
                    {
                        name: "is_video_original",
                        type: "boolean",
                        isNullable: false,
                    },
                    {
                        name: "cert_url",
                        type: "text",
                        isNullable: true,
                    },
                    {
                        name: "is_certified_stone",
                        type: "boolean",
                        isNullable: false,
                    },
                    {
                        name: "is_manual_upload",
                        type: "boolean",
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
                        isNullable: true,
                    },
                    {
                        name: "pdf_url",
                        type: "varchar",
                        length: "255",
                        isNullable: true,
                    },
                ],
                foreignKeys: [
                    {
                        columnNames: ["stone_id"],
                        referencedTableName: "stonedata",
                        referencedColumnNames: ["id"]
                    },
                ],
                uniques: [
                    {
                        columnNames: ["stone_id"]
                    }
                ]
            }),
            true
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop the foreign key constraint first if it exists
        const table = await queryRunner.getTable("media");
        if (table) {
            const foreignKey = table.foreignKeys.find(
                fk => fk.columnNames.indexOf("stone_id") !== -1
            );
            if (foreignKey) {
                await queryRunner.dropForeignKey("media", foreignKey);
            }
        }
        await queryRunner.dropTable("media");
    }

}
