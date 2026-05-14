from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0024_order_payment_token'),
    ]

    operations = [
        migrations.CreateModel(
            name='CategorySubjectField',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('label', models.CharField(max_length=150)),
                ('field_key', models.SlugField(max_length=120)),
                ('field_type', models.CharField(choices=[('text', 'Text'), ('number', 'Number'), ('date', 'Date'), ('textarea', 'Textarea'), ('file', 'Upload file')], default='text', max_length=20)),
                ('is_required', models.BooleanField(default=True)),
                ('help_text', models.CharField(blank=True, max_length=255)),
                ('sort_order', models.PositiveIntegerField(default=0)),
                ('category', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='subject_fields', to='api.category')),
            ],
            options={
                'ordering': ['sort_order', 'id'],
                'unique_together': {('category', 'field_key')},
            },
        ),
        migrations.CreateModel(
            name='OrderItemSubject',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('index', models.PositiveIntegerField(default=1)),
                ('label', models.CharField(blank=True, max_length=150)),
                ('data', models.JSONField(blank=True, default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('order_item', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='subjects', to='api.orderitem')),
            ],
            options={
                'ordering': ['index', 'id'],
                'unique_together': {('order_item', 'index')},
            },
        ),
    ]
