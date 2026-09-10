export const sendSuccess = (res, data = {}, message = 'Success', status = 200) => {
  return res.status(status).json({
    success: true,
    message,
    data
  });
};

export const sendError = (res, message = 'An error occurred', status = 400, code = null) => {
  return res.status(status).json({
    success: false,
    message,
    code
  });
};
