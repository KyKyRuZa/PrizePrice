import SequelizePkg from "sequelize";

const { DataTypes } = SequelizePkg;

export async function up({ queryInterface, transaction }) {
  await queryInterface.addColumn("users", "sms_opt_out", {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: "sms_opt_out",
  });

  await queryInterface.addColumn("users", "sms_opt_out_at", {
    type: DataTypes.DATE,
    allowNull: true,
    field: "sms_opt_out_at",
  });

  await queryInterface.addColumn("users", "sms_opt_out_ip", {
    type: DataTypes.STRING,
    allowNull: true,
    field: "sms_opt_out_ip",
  });
}

export async function down({ queryInterface, transaction }) {
  await queryInterface.removeColumn("users", "sms_opt_out");
  await queryInterface.removeColumn("users", "sms_opt_out_at");
  await queryInterface.removeColumn("users", "sms_opt_out_ip");
}
