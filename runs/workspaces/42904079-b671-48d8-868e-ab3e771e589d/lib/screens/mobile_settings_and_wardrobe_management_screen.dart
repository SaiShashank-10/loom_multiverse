import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'dart:convert';
import '../widgets/style_components.dart';
import '../data/style_data.dart';

class MobileSettingsAndWardrobeManagementScreen extends StatefulWidget {
  const MobileSettingsAndWardrobeManagementScreen({super.key});
  @override
  State<MobileSettingsAndWardrobeManagementScreen> createState() =>
      _SettingsState();
}

class _SettingsState extends State<MobileSettingsAndWardrobeManagementScreen> {
  final data = StyleData.instance;
  void change(VoidCallback update) {
    setState(update);
    persist(context, 'Preferences saved on this device.');
  }

  @override
  Widget build(BuildContext context) => StyleScaffold(
      title: 'Settings & Preferences',
      subtitle: 'Style OS Engine v3.4',
      actions: [
        IconButton(
            tooltip: 'Save preferences',
            icon: const Icon(Icons.check, color: green),
            onPressed: () =>
                persist(context, 'Preferences saved on this device.'))
      ],
      body: ListView(padding: const EdgeInsets.all(18), children: [
        Panel(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            ClipOval(
                child: SizedBox(
                    width: 64,
                    height: 64,
                    child: ReferenceImage('settings_0', height: 64))),
            const SizedBox(width: 12),
            Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  heading('Sarah Thompson', 18),
                  detail('Marketing Manager · sample profile'),
                  const SizedBox(height: 5),
                  const Pill('Versatility Score: 88% · reference',
                      icon: Icons.auto_awesome)
                ]))
          ]),
          const SizedBox(height: 26),
          const SectionTitle('AI Styling Persona',
              icon: Icons.checkroom_outlined),
          Row(children: [
            _field('Body Shape', 'Hourglass'),
            _field('Color Season', 'Soft Autumn'),
            _field('Dressing Mood', 'Executive')
          ]),
          const SizedBox(height: 20),
          heading('Physical Baseline & Silhouette', 16),
          const SizedBox(height: 12),
          Row(children: [
            Expanded(
                child: TextFormField(
                    initialValue: data.height,
                    decoration: _input('Height'),
                    onChanged: (v) => data.height = v)),
            const SizedBox(width: 10),
            Expanded(
                child: TextFormField(
                    initialValue: data.measurements,
                    decoration: _input('B-W-H'),
                    onChanged: (v) => data.measurements = v))
          ]),
          const SizedBox(height: 18),
          heading('Default AI Fit Bias', 16),
          const SizedBox(height: 8),
          TonalChoices(const ['Fitted', 'Relaxed', 'Tailored'], data.fit,
              (v) => change(() => data.fit = v))
        ])),
        const SizedBox(height: 18),
        Panel(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const SectionTitle('Atmospheric Synthesis',
              icon: Icons.wb_sunny_outlined),
          detail('Synchronize outfit preferences to microclimates'),
          const SizedBox(height: 14),
          Panel(
              color: pale,
              padding: const EdgeInsets.all(12),
              child: Row(children: [
                const Icon(Icons.wb_sunny_outlined,
                    color: Colors.orange, size: 30),
                const SizedBox(width: 10),
                Expanded(
                    child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                      heading('72°F · London, UK', 17),
                      detail('Reference weather · live sync not connected')
                    ]))
              ])),
          const SizedBox(height: 18),
          heading('Temperature Sensitivity', 16),
          const SizedBox(height: 7),
          TonalChoices(const ['Runs Cold', 'Balanced', 'Runs Warm'],
              data.temperature, (v) => change(() => data.temperature = v)),
          const SizedBox(height: 16),
          heading('Primary Daily Commute', 16),
          const SizedBox(height: 7),
          TonalChoices(const ['Walking', 'Transit', 'Driving'], data.commute,
              (v) => change(() => data.commute = v)),
          SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Precipitation & Rain Safeguard',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
              subtitle: detail('Prioritize water-resistant outerwear'),
              value: data.rain,
              onChanged: (v) => change(() => data.rain = v))
        ])),
        const SizedBox(height: 18),
        Panel(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const SectionTitle('Wardrobe Matrix Intelligence',
              icon: Icons.checkroom),
          detail('Categorization, automated tagging & health'),
          SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Auto-Fabric Detection',
                  style: TextStyle(fontSize: 13)),
              subtitle: detail('Requires a connected recognition service'),
              value: false,
              onChanged: (_) => message(context,
                  'Garment recognition has not been connected. This setting remains off.')),
          SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Cost-Per-Wear Tracker',
                  style: TextStyle(fontSize: 13)),
              subtitle: detail('Preference for future confirmed wardrobe logs'),
              value: data.cpw,
              onChanged: (v) => change(() => data.cpw = v)),
          const SizedBox(height: 8),
          DropdownButtonFormField<int>(
              initialValue: data.dormancy,
              decoration: const InputDecoration(
                  labelText: 'Closet Dormancy Alert',
                  border: OutlineInputBorder()),
              items: const [
                DropdownMenuItem(
                    value: 15, child: Text('15 Days · High Agility')),
                DropdownMenuItem(value: 45, child: Text('45 Days · Standard')),
                DropdownMenuItem(value: 90, child: Text('90 Days · Seasonal'))
              ],
              onChanged: (v) {
                if (v != null) change(() => data.dormancy = v);
              }),
          const SizedBox(height: 10),
          detail(
              'Items unworn past this threshold can be flagged for intentional recombination.'),
          const SizedBox(height: 12),
          Wrap(spacing: 8, children: [
            OutlinedButton.icon(
                onPressed: () => openScreen(context, '/closet'),
                icon: const Icon(Icons.layers_outlined, size: 16),
                label: const Text('Bulk Manage')),
            OutlinedButton.icon(
                onPressed: () async {
                  await Clipboard.setData(ClipboardData(
                      text: jsonEncode({
                    'fit': data.fit,
                    'commute': data.commute,
                    'temperature': data.temperature,
                    'dormancyDays': data.dormancy
                  })));
                  if (context.mounted)
                    message(context, 'Preferences JSON copied to clipboard.');
                },
                icon: const Icon(Icons.file_download_outlined, size: 16),
                label: const Text('Export JSON'))
          ])
        ])),
        const SizedBox(height: 18),
        Panel(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const SectionTitle('Neural Privacy & Render Cache',
              icon: Icons.security),
          detail('Local privacy preferences; no biometric data is collected'),
          SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('On-Device 3D Mesh Processing',
                  style: TextStyle(fontSize: 13)),
              subtitle: detail('Preference only · 3D processing not connected'),
              value: data.privacy,
              onChanged: (v) => change(() => data.privacy = v)),
          ListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Local Virtual Try-On Cache',
                  style: TextStyle(fontSize: 13)),
              subtitle: detail('No generated render cache'),
              trailing: TextButton(
                  onPressed: () => message(
                      context, 'There are no generated 3D renders to clear.'),
                  child: const Text('Purge'))),
          SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Anonymous Curation Insights',
                  style: TextStyle(fontSize: 13)),
              subtitle: detail('No telemetry is sent from this local preview'),
              value: false,
              onChanged: (_) =>
                  message(context, 'Telemetry collection is not connected.'))
        ])),
        const SizedBox(height: 20),
        ActionButton(
            'Sartorial Profile',
            Icons.person_outline,
            () => message(context,
                'This is the approved sample profile. No authentication session is active.'),
            secondary: true),
        const SizedBox(height: 12),
        Center(child: detail('Style OS · Flutter local design preview')),
        const SizedBox(height: 24)
      ]));

  InputDecoration _input(String label) => InputDecoration(
      labelText: label,
      filled: true,
      fillColor: pale,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(28),
          borderSide: BorderSide.none));

  Widget _field(String name, String value) => Expanded(
      child: Padding(
          padding: const EdgeInsets.only(right: 5),
          child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 16),
              decoration: BoxDecoration(
                  color: pale, borderRadius: BorderRadius.circular(28)),
              child: Column(children: [
                Text(name, style: const TextStyle(fontSize: 10, color: muted)),
                const SizedBox(height: 6),
                Text(value, style: const TextStyle(fontSize: 12, color: ink))
              ]))));
}
