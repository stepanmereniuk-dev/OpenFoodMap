from django.db import models
from .user_model import User


class Commenter(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='commenter_profile')
    bio = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Commenter: {self.user.username}"
