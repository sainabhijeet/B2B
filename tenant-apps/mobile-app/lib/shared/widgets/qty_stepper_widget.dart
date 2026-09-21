import 'package:flutter/material.dart';

/// Quantity control — stateless; parent owns value.
class QtyStepperWidget extends StatelessWidget {
  const QtyStepperWidget({
    super.key,
    required this.qty,
    required this.onChanged,
    this.min = 0,
  });

  final int qty;
  final ValueChanged<int> onChanged;
  final int min;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        IconButton(
          visualDensity: VisualDensity.compact,
          onPressed: qty > min ? () => onChanged(qty - 1) : null,
          icon: const Icon(Icons.remove_circle_outline),
        ),
        SizedBox(
          width: 28,
          child: Text(
            '$qty',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.titleMedium,
          ),
        ),
        IconButton(
          visualDensity: VisualDensity.compact,
          onPressed: () => onChanged(qty + 1),
          icon: const Icon(Icons.add_circle_outline),
        ),
      ],
    );
  }
}
