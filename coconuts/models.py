# -*- coding: utf-8 -*-
#
# Copyright (C) 2008-2013 Jeremy Lainé
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.
#

import os

from django.db import models
from django.conf import settings
from django.contrib.auth.models import User, Group
from django.utils.translation import ugettext_lazy as _
import Image

import coconuts.EXIF as EXIF

ORIENTATIONS = {
    1: [ False, False, 0   ], # Horizontal (normal)
    2: [ True,  False, 0   ], # Mirrored horizontal
    3: [ False, False, 180 ], # Rotated 180
    4: [ False, True,  0   ], # Mirrored vertical
    5: [ True,  False, 90 ], # Mirrored horizontal then rotated 90 CCW
    6: [ False, False, -90  ], # Rotated 90 CW
    7: [ True,  False, -90  ], # Mirrored horizontal then rotated 90 CW
    8: [ False, False, 90 ], # Rotated 90 CCW
}

def url2path(url):
    return url.replace('/', os.path.sep)

def path2url(path):
    return path.replace(os.path.sep, '/')

class OtherManager:
    def all(self):
        return self

    def order_by(self, key):
        return [Other('all')]

class Other:
    objects = OtherManager()

    def __init__(self, name):
        self.name = name

    def __unicode__(self):
        return self.name

USERS_DIR = 'users'

OWNERS = [
    (User, 'username'),
    (Group, 'name'),
    (Other, 'name')]

PERMISSIONS = {
    'can_read': 'r',
    'can_write': 'w',
    'can_manage': 'x'}

PERMISSION_NAMES = {
    'can_read': _('Can read'),
    'can_write': _('Can write'),
    'can_manage': _('Can manage')}

class NamedAcl:
    def __init__(self, acl):
        self.type, self.name, self.permissions = acl.split(':')

    def __unicode__(self):
        return "%s:%s:%s" % (self.type, self.name, self.permissions)

    def add_perm(self, perm):
        """Add a given permission to this ACL."""
        bit = PERMISSIONS[perm]
        if not self.has_perm(perm):
            self.permissions += bit

    def has_perm(self, perm):
        """Check whether this ACL contains a given permission."""
        bit = PERMISSIONS[perm]
        return self.permissions.count(bit) > 0

class Share(models.Model):
    path = models.CharField(max_length=50, primary_key=True)
    description = models.CharField(max_length=200, verbose_name=_("Description"))
    access = models.TextField()

    def acls(self):
        """Return the ACLs associated with this share."""
        for acl in self.access.split(","):
            if acl: yield NamedAcl(acl)

    def set_acls(self, acls):
        """Set the ACLs associated with this share."""
        self.access = ",".join([unicode(x) for x in acls])

    def name(self):
        """Get the share's friendly name."""
        return os.path.basename(self.path)

    def has_perm(self, perm, user):
        """Check whether a user has a given permission."""
        if user.is_superuser:
            return True

        username = user.username
        groupnames = [ x.name for x in user.groups.all() ]
        for acl in self.acls():
            if acl.has_perm(perm):
                if acl.type == "other":
                    return True
                if acl.type == "user" and username == acl.name:
                    return True
                elif acl.type == "group" and groupnames.count(acl.name):
                    return True

        return False

    def __unicode__(self):
        return self.path

class Folder:
    class DoesNotExist(Exception):
        pass

    def __init__(self, path):
        self.path = path

        # Check folder exists
        if not os.path.exists(self.filepath()):
            raise self.DoesNotExist

        # Create share if needed
        sharepath = self.path.split("/")[0]
        try:
            self.share = Share.objects.get(path=sharepath)
        except Share.DoesNotExist:
            self.share = Share(path=sharepath)

    def __unicode__(self):
        return self.name()

    @classmethod
    def create(klass, path):
        """Create the folder."""
        filepath = os.path.join(settings.COCONUTS_DATA_ROOT, url2path(path))
        if not os.path.exists(filepath):
            os.mkdir(filepath)
        return klass(path)

    def filepath(self):
        """Get the folder's full path."""
        return os.path.join(settings.COCONUTS_DATA_ROOT, url2path(self.path))

    def name(self):
        """Get the folder's name."""
        if not self.path:
            try:
                return settings.COCONUTS_TITLE
            except:
                return 'Shares'
        else:
            return os.path.basename(self.path)

    def has_perm(self, perm, user):
        """Check whether a user has a given permission."""
        return self.share.has_perm(perm, user)

class File:
    class DoesNotExist(Exception):
        pass

    def __init__(self, path):
        self.path = path
        if not os.path.exists(self.filepath()):
            raise self.DoesNotExist

    def __unicode__(self):
        return self.name()

    @classmethod
    def isdir(self, path):
        filepath = os.path.join(settings.COCONUTS_DATA_ROOT, url2path(path))
        return os.path.isdir(filepath)

    def filepath(self):
        """Get the file's full path."""
        return os.path.join(settings.COCONUTS_DATA_ROOT, url2path(self.path))

    def name(self):
        """Get the file's name."""
        return os.path.basename(self.path)

class Photo(File):
    def __init__(self, path):
        File.__init__(self, path)

    def cache(self, size):
        """Get a resized version of the photo."""
        cachesize = size, int(size * 0.75)
        cachepath = os.path.join(str(size), url2path(self.path))
        cachefile = os.path.join(settings.COCONUTS_CACHE_ROOT, cachepath)
        if not os.path.exists(cachefile):
            cachedir = os.path.dirname(cachefile)
            if not os.path.exists(cachedir):
                os.makedirs(cachedir)
            img = Image.open(self.filepath())

            # rotate if needed
            with open(self.filepath, 'rb') as fp:
                tags = EXIF.process_file(fp, details=False)
                if tags.has_key('Image Orientation'):
                    orientation = tags['Image Orientation'].values[0]
                    img = img.rotate(ORIENTATIONS[orientation][2])

            img.thumbnail(cachesize, Image.ANTIALIAS)
            img.save(cachefile, quality=90)
        return path2url(cachepath)
