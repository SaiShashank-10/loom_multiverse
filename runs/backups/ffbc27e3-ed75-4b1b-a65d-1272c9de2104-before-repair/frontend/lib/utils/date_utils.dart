import 'package:intl/intl.dart';

class DateUtils {
  static String formatDateTime(DateTime dateTime) {
    return DateFormat('yyyy-MM-dd HH:mm:ss').format(dateTime);
  }

  static DateTime parseDateTime(String dateTimeString) {
    try {
      return DateFormat('yyyy-MM-dd HH:mm:ss').parse(dateTimeString);
    } catch (e) {
      throw FormatException("Invalid date time format");
    }
  }

  static String formatDate(DateTime dateTime) {
    return DateFormat('yyyy-MM-dd').format(dateTime);
  }

  static DateTime parseDate(String dateString) {
    try {
      return DateFormat('yyyy-MM-dd').parse(dateString);
    } catch (e) {
      throw FormatException("Invalid date format");
    }
  }

  static String formatTime(DateTime dateTime) {
    return DateFormat('HH:mm:ss').format(dateTime);
  }

  static DateTime parseTime(String timeString) {
    try {
      return DateFormat('HH:mm:ss').parse(timeString);
    } catch (e) {
      throw FormatException("Invalid time format");
    }
  }

  static String getMonthName(int month) {
    switch (month) {
      case 1:
        return 'January';
      case 2:
        return 'February';
      case 3:
        return 'March';
      case 4:
        return 'April';
      case 5:
        return 'May';
      case 6:
        return 'June';
      case 7:
        return 'July';
      case 8:
        return 'August';
      case 9:
        return 'September';
      case 10:
        return 'October';
      case 11:
        return 'November';
      case 12:
        return 'December';
      default:
        throw ArgumentError("Invalid month number");
    }
  }

  static int getDayOfWeek(DateTime dateTime) {
    return dateTime.weekday;
  }

  static DateTime addDays(DateTime dateTime, int days) {
    return dateTime.add(Duration(days: days));
  }

  static DateTime subtractDays(DateTime dateTime, int days) {
    return dateTime.subtract(Duration(days: days));
  }

  static DateTime addMonths(DateTime dateTime, int months) {
    return dateTime.add(Duration(months: months));
  }

  static DateTime subtractMonths(DateTime dateTime, int months) {
    return dateTime.subtract(Duration(months: months));
  }

  static DateTime addYears(DateTime dateTime, int years) {
    return dateTime.add(Duration(years: years));
  }

  static DateTime subtractYears(DateTime dateTime, int years) {
    return dateTime.subtract(Duration(years: years));
  }

  static bool isSameDay(DateTime date1, DateTime date2) {
    return date1.year == date2.year &&
        date1.month == date2.month &&
        date1.day == date2.day;
  }

  static bool isSameMonth(DateTime date1, DateTime date2) {
    return date1.year == date2.year && date1.month == date2.month;
  }

  static bool isSameYear(DateTime date1, DateTime date2) {
    return date1.year == date2.year;
  }
}