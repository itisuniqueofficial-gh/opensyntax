import {printError, printSuccess, printWarning, printStatus} from './layout.js';

export const notify = {
  success: printSuccess,
  warning: printWarning,
  error: printError,
  status: printStatus
};
