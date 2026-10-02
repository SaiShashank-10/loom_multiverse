import 'package:flutter/material.dart';
import '../data/style_data.dart';

const ink = Color(0xff181c23),
    primary = Color(0xff0059bb),
    canvas = Color(0xfff9f9ff);
const muted = Color(0xff575f67),
    pale = Color(0xfff1f3fd),
    line = Color(0xffe5e8f2);
const green = Color(0xff006b24);
const routes = ['/', '/virtual_try_on', '/scan', '/closet', '/health'];
const navIcons = [
  Icons.home_rounded,
  Icons.view_in_ar,
  Icons.photo_camera_outlined,
  Icons.checkroom_outlined,
  Icons.analytics_outlined
];
const navLabels = ['Home', 'Try-On', 'Scan', 'Closet', 'Health'];

Text heading(String text, [double size = 20]) => Text(text,
    style: TextStyle(
        fontFamily: 'Space Grotesk',
        fontSize: size,
        height: 1.2,
        fontWeight: FontWeight.w700,
        color: ink));
Text detail(String text, [Color color = muted]) =>
    Text(text, style: TextStyle(fontSize: 12, height: 1.4, color: color));
void openScreen(BuildContext context, String route) =>
    Navigator.of(context).pushNamed(route);
void message(BuildContext context, String text) =>
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));
Future<void> persist(BuildContext context, String text) async {
  try {
    await StyleData.instance.save();
    if (context.mounted) message(context, text);
  } catch (_) {
    if (context.mounted)
      message(context, 'Could not save locally. Please try again.');
  }
}

class Pill extends StatelessWidget {
  final String text;
  final Color color;
  final IconData? icon;
  const Pill(this.text, {this.color = primary, this.icon, super.key});
  @override
  Widget build(BuildContext context) => Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
      decoration: BoxDecoration(
          color: color.withValues(alpha: .08),
          borderRadius: BorderRadius.circular(30)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        if (icon != null) ...[
          Icon(icon, size: 13, color: color),
          const SizedBox(width: 4)
        ],
        Flexible(
            child: Text(text,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                    color: color, fontSize: 10, fontWeight: FontWeight.w600)))
      ]));
}

class Panel extends StatelessWidget {
  final Widget child;
  final Color color;
  final EdgeInsets padding;
  const Panel(
      {required this.child,
      this.color = Colors.white,
      this.padding = const EdgeInsets.all(16),
      super.key});
  @override
  Widget build(BuildContext context) => Container(
      padding: padding,
      decoration: BoxDecoration(
          color: color,
          border: Border.all(color: line.withValues(alpha: .8)),
          borderRadius: BorderRadius.circular(22),
          boxShadow: [
            BoxShadow(
                color: ink.withValues(alpha: .025),
                blurRadius: 18,
                offset: const Offset(0, 5))
          ]),
      child: child);
}

class ReferenceImage extends StatelessWidget {
  final String asset;
  final double height;
  final String label;
  final Alignment alignment;
  const ReferenceImage(this.asset,
      {this.height = 150,
      this.label = 'Approved design wardrobe image',
      this.alignment = Alignment.center,
      super.key});
  @override
  Widget build(BuildContext context) => ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: Image.asset('assets/stitch/$asset.jpg',
          height: height,
          width: double.infinity,
          fit: BoxFit.cover,
          alignment: alignment,
          semanticLabel: label,
          errorBuilder: (_, error, stack) => SizedBox(
              height: height,
              child: const Center(child: Text('Image unavailable')))));
}

class SectionTitle extends StatelessWidget {
  final String title;
  final IconData? icon;
  final Widget? trailing;
  const SectionTitle(this.title, {this.icon, this.trailing, super.key});
  @override
  Widget build(BuildContext context) => Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(children: [
        if (icon != null) ...[
          Icon(icon, size: 20, color: primary),
          const SizedBox(width: 8)
        ],
        Expanded(child: heading(title, 17)),
        if (trailing != null) trailing!
      ]));
}

class ActionButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final VoidCallback onTap;
  final bool secondary;
  const ActionButton(this.label, this.icon, this.onTap,
      {this.secondary = false, super.key});
  @override
  Widget build(BuildContext context) => SizedBox(
      width: double.infinity,
      child: FilledButton.icon(
          onPressed: onTap,
          icon: Icon(icon, size: 19),
          label: Padding(
              padding: const EdgeInsets.symmetric(vertical: 13),
              child: Text(label, textAlign: TextAlign.center)),
          style: FilledButton.styleFrom(
              backgroundColor: secondary ? pale : primary,
              foregroundColor: secondary ? primary : Colors.white,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14)),
              textStyle: const TextStyle(
                  fontFamily: 'Hanken Grotesk',
                  fontSize: 12,
                  fontWeight: FontWeight.w600))));
}

class ChoiceStrip extends StatelessWidget {
  final List<String> values;
  final String selected;
  final ValueChanged<String> onChanged;
  const ChoiceStrip(this.values, this.selected, this.onChanged, {super.key});
  @override
  Widget build(BuildContext context) => SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
          children: values
              .map((value) => Padding(
                  padding: const EdgeInsets.only(right: 7),
                  child: ChoiceChip(
                      label: Text(value),
                      selected: selected == value,
                      onSelected: (_) => onChanged(value),
                      showCheckmark: false,
                      selectedColor: ink,
                      backgroundColor: Colors.white,
                      side: const BorderSide(color: line),
                      labelStyle: TextStyle(
                          fontSize: 11,
                          color: selected == value ? Colors.white : muted),
                      padding: const EdgeInsets.symmetric(horizontal: 5),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(30)))))
              .toList()));
}

class StyleScaffold extends StatelessWidget {
  final String title, subtitle;
  final int index;
  final Widget body;
  final bool rail;
  final List<Widget>? actions;
  final Widget? floating;
  const StyleScaffold(
      {required this.title,
      required this.body,
      this.subtitle = '',
      this.index = 0,
      this.rail = false,
      this.actions,
      this.floating,
      super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
      backgroundColor: canvas,
      appBar: AppBar(
          backgroundColor: canvas,
          surfaceTintColor: Colors.transparent,
          toolbarHeight: 64,
          leading: index == 0 && rail
              ? Builder(
                  builder: (c) => IconButton(
                      tooltip: 'Open navigation',
                      icon: const Icon(Icons.menu),
                      onPressed: () => Scaffold.of(c).openDrawer()))
              : IconButton(
                  tooltip: 'Back',
                  icon: const Icon(Icons.arrow_back),
                  onPressed: () => Navigator.of(context).maybePop()),
          titleSpacing: 0,
          title: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                heading(title, 17),
                if (subtitle.isNotEmpty) detail(subtitle)
              ]),
          actions: actions ??
              [
                IconButton(
                    tooltip: 'Settings',
                    icon: const Icon(Icons.tune, color: primary),
                    onPressed: () => openScreen(context, '/settings'))
              ]),
      drawer: Drawer(
          backgroundColor: canvas,
          child: SafeArea(
              child: ListView(padding: const EdgeInsets.all(20), children: [
            const ReferenceImage('home_0', height: 150),
            const SizedBox(height: 14),
            heading('Sarah Thompson'),
            detail('Design preview · sample wardrobe'),
            const SizedBox(height: 24),
            ...List.generate(
                5,
                (i) => ListTile(
                    leading: Icon(navIcons[i], color: primary),
                    title: Text(navLabels[i]),
                    onTap: () {
                      Navigator.pop(context);
                      openScreen(context, routes[i]);
                    })),
            ListTile(
                leading: const Icon(Icons.settings_outlined),
                title: const Text('Settings'),
                onTap: () {
                  Navigator.pop(context);
                  openScreen(context, '/settings');
                })
          ]))),
      body: SafeArea(
          top: false,
          bottom: false,
          child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            if (rail)
              Container(
                  width: 48,
                  decoration: const BoxDecoration(
                      color: Colors.white,
                      border: Border(right: BorderSide(color: line))),
                  child: Column(children: [
                    const SizedBox(height: 18),
                    const CircleAvatar(
                        radius: 17,
                        backgroundColor: pale,
                        child: Text('ST',
                            style: TextStyle(fontSize: 11, color: primary))),
                    const SizedBox(height: 22),
                    ...List.generate(
                        5,
                        (i) => Padding(
                            padding: const EdgeInsets.only(bottom: 14),
                            child: IconButton(
                                tooltip: navLabels[i],
                                onPressed: () => openScreen(context, routes[i]),
                                icon: Icon(navIcons[i], size: 21),
                                style: IconButton.styleFrom(
                                    backgroundColor: index == i
                                        ? primary
                                        : Colors.transparent,
                                    foregroundColor:
                                        index == i ? Colors.white : muted)))),
                    IconButton(
                        tooltip: 'Preferences',
                        onPressed: () => openScreen(context, '/settings'),
                        icon: const Icon(Icons.tune, size: 21))
                  ])),
            Expanded(child: body)
          ])),
      floatingActionButton: floating,
      bottomNavigationBar: SafeArea(
          top: false,
          child: Container(
              height: 66,
              decoration: const BoxDecoration(
                  color: Colors.white,
                  border: Border(top: BorderSide(color: line))),
              child: Row(
                  children: List.generate(
                      5,
                      (i) => Expanded(
                          child: InkWell(
                              onTap: () {
                                if (i != index) openScreen(context, routes[i]);
                              },
                              child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Container(
                                        padding: const EdgeInsets.all(8),
                                        decoration: BoxDecoration(
                                            color: index == i
                                                ? primary
                                                : Colors.transparent,
                                            shape: BoxShape.circle),
                                        child: Icon(navIcons[i],
                                            size: 20,
                                            color: index == i
                                                ? Colors.white
                                                : muted)),
                                    Text(navLabels[i],
                                        style: TextStyle(
                                            fontSize: 9,
                                            color: index == i ? primary : muted,
                                            fontWeight: FontWeight.w600))
                                  ]))))))));
}

class TonalChoices extends StatelessWidget {
  final List<String> values;
  final String selected;
  final ValueChanged<String> onChanged;
  const TonalChoices(this.values, this.selected, this.onChanged, {super.key});
  @override
  Widget build(BuildContext context) => Container(
      padding: const EdgeInsets.all(4),
      decoration:
          BoxDecoration(color: pale, borderRadius: BorderRadius.circular(28)),
      child: Row(
          children: values
              .map((value) => Expanded(
                  child: InkWell(
                      onTap: () => onChanged(value),
                      borderRadius: BorderRadius.circular(24),
                      child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          decoration: BoxDecoration(
                              color: selected == value
                                  ? Colors.white
                                  : Colors.transparent,
                              borderRadius: BorderRadius.circular(24)),
                          child: Text(value,
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                  fontSize: 11,
                                  color: selected == value ? primary : muted,
                                  fontWeight: selected == value
                                      ? FontWeight.w700
                                      : FontWeight.w400))))))
              .toList()));
}
