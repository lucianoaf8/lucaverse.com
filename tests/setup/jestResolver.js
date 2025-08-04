const { resolve } = require('jest-resolve');
const path = require('path');

module.exports = (request, options) => {
  // Handle CSS module files
  if (request.match(/\.(css|less|scss|sass)$/)) {
    return 'identity-obj-proxy';
  }
  
  // Handle image files  
  if (request.match(/\.(png|jpg|jpeg|gif|svg)$/)) {
    return 'identity-obj-proxy';
  }

  // Default resolution
  return resolve(request, options);
};