export default {
  rules: {
    // motion/react does not bundle LazyMotion; rule targets framer-motion directly.
    "react-doctor/use-lazy-motion": "off",
    // PriceTrendChartView is loaded via React.lazy in PriceTrendChart.tsx (separate chunk).
    "react-doctor/prefer-dynamic-import": "off",
  },
};
