"""
کلاس پای Declarative برای تمام مدل‌های SQLAlchemy پروژه.
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """همه جداول از این کلاس ارث می‌برند تا metadata یکپارچه باشد."""

    pass
