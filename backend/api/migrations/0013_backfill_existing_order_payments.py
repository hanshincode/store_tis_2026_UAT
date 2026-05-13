from django.db import migrations


def backfill_existing_order_payments(apps, schema_editor):
    Order = apps.get_model('api', 'Order')
    for order in Order.objects.filter(status__in=['pending', 'confirmed', 'active']):
        order.payment_status = 'paid'
        order.payment_paid_at = order.created_at
        order.payment_reference = order.payment_reference or order.code
        order.save(update_fields=['payment_status', 'payment_paid_at', 'payment_reference'])


def reverse_backfill(apps, schema_editor):
    Order = apps.get_model('api', 'Order')
    Order.objects.filter(status__in=['pending', 'confirmed', 'active']).update(
        payment_status='unpaid',
        payment_paid_at=None,
    )


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0012_order_payment_expires_at_order_payment_paid_at_and_more'),
    ]

    operations = [
        migrations.RunPython(backfill_existing_order_payments, reverse_backfill),
    ]
