'use strict';
'require rpc';
'require form';
'require network';

var callTTYDevices = rpc.declare({
	object: 'luci',
	method: 'getTTYDevices',
	params: [ 'with_cdc', 'with_tts' ],
	expect: { result: [] }
});

network.registerPatternVirtual(/^qmi-.+$/);
network.registerErrorCode('CALL_FAILED', _('Call failed'));
network.registerErrorCode('NO_CID',      _('Unable to obtain client ID'));
network.registerErrorCode('PLMN_FAILED', _('Setting PLMN failed'));

return network.registerProtocol('qmi', {
	getI18n: function() {
		return _('QMI Cellular');
	},

	getIfname: function() {
		return this._ubus('l3_device') || 'qmi-%s'.format(this.sid);
	},

	getOpkgPackage: function() {
		return 'uqmi';
	},

	isFloating: function() {
		return true;
	},

	isVirtual: function() {
		return true;
	},

	getDevices: function() {
		return null;
	},

	containsDevice: function(ifname) {
		return (network.getIfnameOf(ifname) == this.getIfname());
	},

	renderFormOptions: function(s) {
		var dev = this.getL3Device() || this.getDevice(), o;

		o = s.taboption('general', form.Value, 'device', _('Modem device'));
		o.rmempty = false;
		o.load = function(section_id) {
			return callTTYDevices(true, false).then(L.bind(function(devices) {
				if (Array.isArray(devices))
					for (var i = 0; i < devices.length; i++)
						if (/cdc-wdm/.test(devices[i]))
							this.value(devices[i]);

				return form.Value.prototype.load.apply(this, [section_id]);
			}, this));
		};

		s.taboption('general', form.Value, 'apn', _('APN'));
		s.taboption('general', form.Value, 'pincode', _('PIN'));

		o = s.taboption('general', form.ListValue, 'auth', _('Authentication Type'));
		o.value('both', 'PAP/CHAP (both)');
		o.value('pap', 'PAP');
		o.value('chap', 'CHAP');
		o.value('none', 'NONE');
		o.default = 'none';

		o = s.taboption('general', form.Value, 'username', _('PAP/CHAP username'));
		o.depends('auth', 'pap');
		o.depends('auth', 'chap');
		o.depends('auth', 'both');

		o = s.taboption('general', form.Value, 'password', _('PAP/CHAP password'));
		o.depends('auth', 'pap');
		o.depends('auth', 'chap');
		o.depends('auth', 'both');
		o.password = true;

		if (L.hasSystemFeature('ipv6')) {
			o = s.taboption('advanced', form.Flag, 'ipv6', _('Enable IPv6 negotiation'));
			o.default = o.disabled;
		}

		o = s.taboption('advanced', form.Value, 'delay', _('Modem init timeout'), _('Maximum amount of seconds to wait for the modem to become ready'));
		o.placeholder = '10';
		o.datatype    = 'min(1)';

		o = s.taboption('advanced', form.Value, 'mtu', _('Override MTU'));
		o.placeholder = dev ? (dev.getMTU() || '1500') : '1500';
		o.datatype    = 'max(9200)';
	}
});
