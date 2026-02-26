1. On already fastbooting device, with the device off, hold power for 4s then release (or the device turns off again). Wait for the Intel NUC logo to appear. If the device boots into the OS, repeat the process. Turn off fastboot until installation is complete.
	Warning: Hardwired USB IO is required!
1. Update BIOS to `KY0074.bio`. BIOS should show: KYSKLi70.86A.0074.2021.1029.0102
1. Disable Legacy Boot, enable only Internal UEFI Shell and USB as boot devices.
1. Boot from Debian Testing USB via EFI (Legacy boot should be disabled), and start installation.

- English
- other
- Europe
- Germany
- en_US.UTF-8
- German
- /dev/eno1 is the network device, enx is Wifi/BT
- oszm1.labnet
- (empty) Root Password
- (empty) Root Password Repeat
- IngKa
- ingka
- (password)
- (password) Repeat
- partition /dev/nvme0n1 with the ESP, and ONLY a single ext4 data partition mounted at /
	ignore bootable flag. it's for legacy boot
- partition /dev/nvme1n1 with ONLY a single btrfs data partition mounted at /opt
- (confirm swap space warning)
- (confirm and install)
- (yes) Network Mirror
- Germany
- mirror.23m.com
- (empty) HTTP Proxy
- yes (Package Survey)
- Desktop Environment, GNOME, SSH server, standard system utilities
- Continue (Reboot)

Installation media no longer required

1. # ssh-keygen -f '/home/oliver/.ssh/known_hosts' -R 'oszm1.labnet'
1. ssh-copy-id -i $HOME/.ssh/id_ed25519 ingka@oszm1.labnet
1. Deploy Ansible role
1. SSH into device

# $ # sudo efibootmgr --bootnum 1 --delete-bootnum
# $ sudo apt update && sudo apt autoremove && sudo apt full-upgrade

1. Ensure /boot only has 1 kernel. sudo rm /boot/*-6.18.9+*

# $ sudo update-grub

1. Reboot. Technically not required, but gives us a good feeling to know it can reboot up until here. Should default boot

# $ sudo dpkg-reconfigure linux-image-$(uname -r)
# $ # sudo efibootmgr --bootnum 1 --delete-bootnum
# $ sudo /sbin/create_EFI_Boot_Entry.sh

1. Reboot. Technically not required, but gives us a good feeling to know it can reboot up until here. Should skip grub

# $ sudo plymouth-set-default-theme -R spinner
# $ sudo reboot

1. Reboot. Should boot: Intel NUC logo -> white blinking cursor -> black -> plymouth spinner -> white blinking cursor -> (cage'd) Chromium

1. SSH into device

