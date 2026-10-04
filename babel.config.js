const envFile =
  process.env.ENVFILE ||
  (process.env.NODE_ENV === 'production' ? '.env.prod' : '.env');

module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    ['@babel/plugin-transform-class-properties', { loose: true }],
    [
      'module:react-native-dotenv',
      {
        moduleName: '@env',
        path: envFile,
        safe: false,
        allowUndefined: true,
        allowlist: ['API_URL', 'HOST_DOMAIN'],
      },
    ],
  ],
  env: {
    production: {
      plugins: [
        ['transform-remove-console', { exclude: ['error', 'warn'] }],
      ],
    },
  },
};
