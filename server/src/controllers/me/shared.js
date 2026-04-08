import { getProductsByIds } from "../../services/products.service.js";

export function isUniqueConstraintForField(error, fieldName) {
  const field = String(fieldName || "").toLowerCase();
  if (!field) return false;

  if (error?.name === "SequelizeUniqueConstraintError") {
    const hasFieldInErrors = Array.isArray(error?.errors)
      ? error.errors.some((item) => String(item?.path || "").toLowerCase() === field)
      : false;
    const constraint = String(error?.parent?.constraint || error?.constraint || "").toLowerCase();
    if (hasFieldInErrors || constraint.includes(field)) return true;
    return true;
  }

  const pgCode = String(error?.parent?.code || error?.code || "");
  if (pgCode === "23505") {
    const constraint = String(error?.parent?.constraint || error?.constraint || "").toLowerCase();
    return constraint.includes(field);
  }

  return false;
}

export function validationError(res) {
  return res.status(400).json({ error: "VALIDATION_ERROR" });
}

export function toFiniteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function requireFiniteNumber(value, res) {
  const parsed = toFiniteNumber(value);
  if (parsed === null) {
    validationError(res);
    return null;
  }
  return parsed;
}

export function requireFiniteParam(req, res, paramName) {
  return requireFiniteNumber(req?.params?.[paramName], res);
}

export async function listCollectionProducts(userId, listIdsFn) {
  const ids = await listIdsFn(userId);
  return getProductsByIds(ids);
}
