/* mq7_module.h
   Simple mapping from ADC reading to gas units used in backend synthetic ranges.
   Tweak mapping constants to match your sensor calibration.
*/

#ifndef MQ7_MODULE_H
#define MQ7_MODULE_H

// Map ADC (0..4095) to gas units (150..700)
// Adjust GAS_UNIT_MIN/MAX if calibration differs.
static const float MQ7_ADC_MIN_F = 0.0f;
static const float MQ7_ADC_MAX_F = 4095.0f;
static const float GAS_UNIT_MIN = 150.0f;
static const float GAS_UNIT_MAX = 700.0f;

inline float mq7_map_adc_to_gas(int adc) {
  float v = (float)adc;
  float t = (v - MQ7_ADC_MIN_F) / (MQ7_ADC_MAX_F - MQ7_ADC_MIN_F);
  if (t < 0.0f) t = 0.0f;
  if (t > 1.0f) t = 1.0f;
  float gas_val = GAS_UNIT_MIN + t * (GAS_UNIT_MAX - GAS_UNIT_MIN);
  return gas_val;
}

#endif // MQ7_MODULE_H
