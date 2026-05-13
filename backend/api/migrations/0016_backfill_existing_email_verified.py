from django.db import migrations


def mark_existing_users_verified(apps, schema_editor):
    User = apps.get_model('api', 'User')
    User.objects.filter(email_verified=False).update(email_verified=True, is_active=True)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0015_user_email_verification_expires_at_and_more'),
    ]

    operations = [
        migrations.RunPython(mark_existing_users_verified, noop_reverse),
    ]
