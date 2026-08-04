// 真实天气服务：Open-Meteo API（免 key），按城市获取当前天气
import type { Weather } from '../types'

/** 全国主要城市坐标表（按拼音/常见名称排序） */
export const CITIES: Array<{ name: string; lat: number; lon: number }> = [
  // 直辖市
  { name: '北京', lat: 39.9042, lon: 116.4074 },
  { name: '上海', lat: 31.2304, lon: 121.4737 },
  { name: '天津', lat: 39.3434, lon: 117.3616 },
  { name: '重庆', lat: 29.563, lon: 106.5516 },
  // 广东
  { name: '广州', lat: 23.1291, lon: 113.2644 },
  { name: '深圳', lat: 22.5431, lon: 114.0579 },
  { name: '珠海', lat: 22.2707, lon: 113.5767 },
  { name: '佛山', lat: 23.0215, lon: 113.1214 },
  { name: '东莞', lat: 23.0207, lon: 113.7518 },
  // 江苏
  { name: '南京', lat: 32.0603, lon: 118.7969 },
  { name: '苏州', lat: 31.2989, lon: 120.5853 },
  { name: '无锡', lat: 31.4912, lon: 120.3119 },
  { name: '常州', lat: 31.8107, lon: 119.9741 },
  // 浙江
  { name: '杭州', lat: 30.2741, lon: 120.1551 },
  { name: '宁波', lat: 29.8683, lon: 121.544 },
  { name: '温州', lat: 27.9938, lon: 120.6994 },
  { name: '绍兴', lat: 30.0303, lon: 120.5802 },
  // 四川
  { name: '成都', lat: 30.5728, lon: 104.0668 },
  { name: '绵阳', lat: 31.4675, lon: 104.6796 },
  // 湖北
  { name: '武汉', lat: 30.5928, lon: 114.3055 },
  { name: '宜昌', lat: 30.6919, lon: 111.2865 },
  // 陕西
  { name: '西安', lat: 34.3416, lon: 108.9398 },
  // 山东
  { name: '济南', lat: 36.6512, lon: 117.1201 },
  { name: '青岛', lat: 36.0671, lon: 120.3826 },
  // 福建
  { name: '福州', lat: 26.0745, lon: 119.2965 },
  { name: '厦门', lat: 24.4798, lon: 118.0894 },
  // 湖南
  { name: '长沙', lat: 28.2282, lon: 112.9388 },
  // 河南
  { name: '郑州', lat: 34.7466, lon: 113.6254 },
  // 安徽
  { name: '合肥', lat: 31.8206, lon: 117.2272 },
  // 江西
  { name: '南昌', lat: 28.682, lon: 115.8579 },
  // 河北
  { name: '石家庄', lat: 38.0428, lon: 114.5149 },
  { name: '唐山', lat: 39.6305, lon: 118.1802 },
  // 辽宁
  { name: '沈阳', lat: 41.8057, lon: 123.4315 },
  { name: '大连', lat: 38.914, lon: 121.6147 },
  // 吉林
  { name: '长春', lat: 43.8171, lon: 125.3235 },
  // 黑龙江
  { name: '哈尔滨', lat: 45.8038, lon: 126.5349 },
  // 山西
  { name: '太原', lat: 37.8706, lon: 112.5489 },
  // 甘肃
  { name: '兰州', lat: 36.0611, lon: 103.8343 },
  // 云南
  { name: '昆明', lat: 24.8801, lon: 102.8329 },
  { name: '丽江', lat: 26.8721, lon: 100.23 },
  // 贵州
  { name: '贵阳', lat: 26.647, lon: 106.6302 },
  // 广西
  { name: '南宁', lat: 22.817, lon: 108.3665 },
  { name: '桂林', lat: 25.2736, lon: 110.2901 },
  // 海南
  { name: '海口', lat: 20.0444, lon: 110.1999 },
  { name: '三亚', lat: 18.2528, lon: 109.5119 },
  // 内蒙古
  { name: '呼和浩特', lat: 40.8424, lon: 111.7492 },
  // 新疆
  { name: '乌鲁木齐', lat: 43.8256, lon: 87.6168 },
  // 宁夏
  { name: '银川', lat: 38.4872, lon: 106.2309 },
  // 青海
  { name: '西宁', lat: 36.6171, lon: 101.7782 },
  // 西藏
  { name: '拉萨', lat: 29.652, lon: 91.1721 },
  // 港澳台
  { name: '香港', lat: 22.3193, lon: 114.1694 },
  { name: '澳门', lat: 22.1987, lon: 113.5439 },
  { name: '台北', lat: 25.033, lon: 121.5654 },
  { name: '高雄', lat: 22.6273, lon: 120.3014 },
]

/** 按城市名查找坐标（找不到返回北京） */
export function getCityCoords(cityName: string): { lat: number; lon: number } {
  const city = CITIES.find((c) => c.name === cityName.trim())
  return city ? { lat: city.lat, lon: city.lon } : { lat: 39.9042, lon: 116.4074 }
}

/** WMO weather code → 我们的天气类型 */
function mapWeatherCode(code: number): Weather {
  // 0 晴 / 1-2 多云 / 3 阴 / 45-48 雾 / 51-67 毛毛雨到雨 / 71-77 雪 / 80-82 阵雨 / 85-86 阵雪 / 95+ 雷暴
  if ([0, 1, 2].includes(code)) return 'sunny'
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snowy'
  // 其余（阴天/雨/雷暴）视为雨天
  return 'rainy'
}

export interface RealWeather {
  weather: Weather
  temperature: number
  city: string
  fetchedAt: number
}

/**
 * 获取真实天气（Open-Meteo，无需 key）。
 * 失败时返回 null，调用方回退到用户设置的天气。
 */
export async function fetchRealWeather(cityName: string): Promise<RealWeather | null> {
  try {
    const { lat, lon } = getCityCoords(cityName)
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto`
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 6000)
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)
    if (!res.ok) return null
    const data = await res.json()
    const code = data?.current_weather?.weathercode
    if (code === undefined) return null
    return {
      weather: mapWeatherCode(code),
      temperature: data.current_weather.temperature,
      city: cityName.trim() || '未知城市',
      fetchedAt: Date.now(),
    }
  } catch {
    return null // 网络失败/超时 → 回退
  }
}
