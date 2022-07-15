module.exports = (on, config) => {
  require("@cypress/code-coverage/task")(on, config);
  
  // it is required that the config is returned
  return config;
};
