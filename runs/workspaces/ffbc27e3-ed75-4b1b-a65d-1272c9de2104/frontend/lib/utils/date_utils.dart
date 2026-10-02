import 'package:intl/intl.dart';

class DateUtils {
  static String formatDate(DateTime value) =>
      DateFormat('yyyy-MM-dd').format(value);
  static DateTime addMonths(DateTime date, int months) {
    final target = DateTime(date.year, date.month + months, 1);
    final last = DateTime(target.year, target.month + 1, 0).day;
    return DateTime(target.year, target.month,
        date.day > last ? last : date.day, date.hour, date.minute, date.second);
  }

  static DateTime subtractMonths(DateTime date, int months) =>
      addMonths(date, -months);
  static DateTime addYears(DateTime date, int years) =>
      addMonths(date, 12 * years);
  static DateTime subtractYears(DateTime date, int years) =>
      addYears(date, -years);
}
