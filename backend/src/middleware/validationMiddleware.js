import { sendError } from '../utils/response.js';

export const validate = (validatorFn) => {
  return (req, res, next) => {
    const result = validatorFn(req.body);
    if (!result.valid) {
      return sendError(res, result.error || 'Validation failed', 422, 'VALIDATION_ERROR');
    }
    next();
  };
};

export default validate;
