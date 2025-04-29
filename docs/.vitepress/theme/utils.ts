import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/zh-cn";
dayjs.locale("zh-cn");
dayjs.extend(relativeTime);

export function fromNow(date: string | Date) {
  return dayjs(date).fromNow();
}

export function formatDate(date: string | Date, f = "YYYY-MM-DD") {
  if (!date) return "";
  return dayjs(date).format(f);
}

export function canConvertToNumber(value) {
  return !isNaN(Number(value));
}
