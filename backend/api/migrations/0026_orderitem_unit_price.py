from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0025_category_subject_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='orderitem',
            name='unit_price',
            field=models.DecimalField(blank=True, decimal_places=0, max_digits=15, null=True),
        ),
    ]
