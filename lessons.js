/* Short, authored study lessons for the Blind-Spots Hub, one per domain.
   Static, offline data (no Claude at runtime). Foundational facts are sourced
   from Wikipedia and cross-checked against this app's own question explanations
   so each lesson targets what the bank actually tests. Lines marked [VERIFY: …]
   are where Wikipedia's general framing and CompTIA's exam-specific expectation
   may differ — the owner fact-checks those before merge.

   Shape per lesson: {title, intro, points[4-6], traps[2-3]}.
   Mirrors the dual-export pattern (window.Lessons / module.exports). */
(function(){
const LESSONS={
  core1:{
    1:{
      title:`Mobile Devices`,
      intro:`Laptops and phones fit desktop capability into compact, battery-powered hardware. Most upgrades and repairs come down to knowing which part does what and how the device connects and syncs.`,
      points:[
        `Laptop RAM is SO-DIMM — physically smaller than a desktop DIMM and not interchangeable with it.`,
        `The display is layered parts: the LCD/OLED panel shows the image, a backlight (or inverter on older LCDs) lights it, and a digitizer senses touch.`,
        `The Fn key plus a function key toggles laptop-specific features: the wireless radio, screen brightness, and switching to an external display.`,
        `Short-range wireless differs by range: Bluetooth pairs peripherals like headsets and keyboards; NFC is tap-to-pay and quick pairing at a few centimeters.`,
        `Mobile Device Management (MDM) lets an organization enforce passcodes, push apps, and remotely lock or wipe a lost device.`,
        `Laptop and phone batteries are lithium-ion; a swollen battery is a safety hazard and must be replaced, never punctured or kept in use.`
      ],
      traps:[
        `Assuming a desktop DIMM fits a laptop — laptops take SO-DIMM only.`,
        `Blaming the whole screen when only the backlight fails: an image that's faintly visible under a flashlight is a backlight/inverter fault, not a dead panel.`,
        `[VERIFY: the exact wireless and connector standard names the 220-1201 objectives expect may differ from this general framing.]`
      ]
    },
    2:{
      title:`Networking`,
      intro:`This domain moves data between devices: addressing, name resolution, the hardware in the path, and common ports and protocols. Many networking questions reward knowing a handful of exact numbers.`,
      points:[
        `Private IPv4 ranges are 10.0.0.0/8, 172.16.0.0–172.31.255.255, and 192.168.0.0/16; anything else is public.`,
        `A 169.254.x.x address is APIPA — the device never got a DHCP lease, so check the cable, switch port, and DHCP server.`,
        `DNS resolves names to IP addresses; if you can reach a site by IP but not by name, DNS is the fault.`,
        `A switch forwards frames by MAC address (Layer 2); a router moves packets between networks by IP address (Layer 3).`,
        `TCP sets up a connection and resends lost data (reliable); UDP is connectionless and fire-and-forget, preferred for real-time voice/video and quick lookups.`,
        `Power over Ethernet (802.3af/at/bt) carries DC power and data on one cable to feed access points, cameras, and VoIP phones.`
      ],
      traps:[
        `Mixing up the private ranges — 172 is private only from 172.16 through 172.31, not all of 172.`,
        `Calling 2.4 GHz "better" because it's common: it has only three non-overlapping channels (1, 6, 11) and congests easily, while 5 GHz has far more.`,
        `[VERIFY: port-number questions expect exact values (e.g. HTTPS 443, SSH 22, RDP 3389) — confirm the full port list the 220-1201 objectives use.]`
      ]
    },
    3:{
      title:`Hardware`,
      intro:`PC hardware is about matching components correctly — memory types, power connectors, storage interfaces, and RAID — plus, heavily on this exam, printers. Many questions test one exact compatibility rule or minimum.`,
      points:[
        `DDR generations are keyed by a notch and are not interchangeable: a DDR4 stick won't seat in a DDR5 slot even though both have 288 pins.`,
        `RAID minimums: RAID 0 needs 2 drives (striping, no redundancy); RAID 1 needs 2 (mirror); RAID 5 needs at least 3 (single distributed parity, survives one failure); RAID 6 needs at least 4 (double parity, survives two).`,
        `RAID 10 (1+0) stripes across mirrored pairs and needs at least 4 drives.`,
        `An M.2 slot can be SATA-only, NVMe-only, or both, keyed B, M, or B+M; an NVMe drive in a SATA-only slot won't be detected.`,
        `ECC memory adds bits to catch and fix single-bit errors and is used in servers; most desktops use non-ECC.`,
        `The laser-printer imaging process runs in order: processing, charging, exposing, developing, transferring, fusing, cleaning.`
      ],
      traps:[
        `Thinking RAID replaces backup — it protects against drive failure, not deletion, fire, or malware.`,
        `Forcing mismatched RAM — DDR4 and DDR5 share a 288-pin count but the notch position differs, so they physically won't swap.`,
        `[VERIFY: the exact order and names of the laser-printer imaging steps the 220-1201 objectives expect.]`
      ]
    },
    4:{
      title:`Virtualization & Cloud`,
      intro:`Virtualization runs multiple isolated operating systems on one physical machine; cloud delivers computing as an on-demand service. Know the hypervisor types and the standard cloud service and deployment models.`,
      points:[
        `A Type 1 (bare-metal) hypervisor runs directly on the hardware (servers); a Type 2 (hosted) hypervisor runs as an application on top of an existing OS (desktops).`,
        `Cloud service models: IaaS provides virtual machines and infrastructure, PaaS provides a platform to build on, SaaS provides finished applications.`,
        `Cloud deployment models: public (shared provider), private (one organization), hybrid (a mix), and community.`,
        `Containers package an app with its dependencies and share the host OS kernel, so they are lighter than full virtual machines.`,
        `Common cloud traits include rapid elasticity, measured/metered usage, on-demand self-service, and resource pooling.`
      ],
      traps:[
        `Swapping Type 1 and Type 2 — bare-metal is Type 1; hosted-on-an-OS is Type 2.`,
        `Treating a container like a VM: a container shares the host kernel and is not a full guest operating system.`
      ]
    },
    5:{
      title:`Hardware & Network Troubleshooting`,
      intro:`This domain tests a repeatable method plus the classic symptoms of failing hardware, displays, storage, and networks. The method itself is worth memorizing — CompTIA tests its steps directly.`,
      points:[
        `The troubleshooting steps: identify the problem; establish a theory of probable cause; test the theory; establish a plan and implement the fix; verify full functionality and apply preventive measures; document findings.`,
        `Consider corporate policies, procedures, and impact, and back up data before you make changes.`,
        `A drive that clicks or raises SMART warnings is failing — back it up immediately before it dies.`,
        `No image with the system running: on laptops check panel vs. backlight (flashlight test); on externals check the cable and input source.`,
        `No POST or repeated beeps points at RAM, GPU, or motherboard — reseat components and read the beep or LED codes.`
      ],
      traps:[
        `Skipping "verify full functionality" or "document findings" — both are explicit, tested steps.`,
        `Changing several things at once so you can't tell which fixed it — test one theory at a time.`,
        `[VERIFY: the exact wording and count of the troubleshooting-methodology steps in the 220-1201 objectives.]`
      ]
    }
  },
  core2:{
    1:{
      title:`Operating Systems`,
      intro:`Core 2's operating-systems domain centers on Windows — editions, built-in tools, networking, and installation — with some macOS and Linux basics. Know which tool does which job and how the editions differ.`,
      points:[
        `Windows editions scale up in features: Home, Pro, Pro for Workstations, and Enterprise; domain join and BitLocker require Pro or higher.`,
        `Key admin tools: Task Manager (processes/performance), Device Manager (hardware/drivers), Disk Management (partitions), and Event Viewer (logs).`,
        `Install types include clean install, in-place upgrade, and image/network deployment; Windows uses NTFS, while removable media often use exFAT or FAT32.`,
        `Windows networking: a workgroup is peer-to-peer, while a domain centralizes accounts and policy through Active Directory.`,
        `macOS uses Time Machine for backup and Disk Utility for drives; Linux uses a package manager and common shell commands for the same jobs.`
      ],
      traps:[
        `Expecting BitLocker or domain join on Windows Home — those need Pro or above. [VERIFY: the exact edition/feature split for the 220-1202 objectives.]`,
        `Confusing an in-place upgrade (keeps files and apps) with a clean install (wipes the volume).`
      ]
    },
    2:{
      title:`Security`,
      intro:`Security is the largest Core 2 domain: authentication, common threats, and how to harden Windows, wireless, and small-office networks. Know the factor types and the current best-practice settings.`,
      points:[
        `Multifactor authentication combines factors from different categories: something you know (password), something you have (token/phone), and something you are (biometric).`,
        `Use WPA3, or WPA2 with AES, on wireless; WEP and WPA/TKIP are broken and must be replaced.`,
        `Principle of least privilege: give each account only the access it needs, and use a standard user rather than administrator for daily work.`,
        `Common threats include phishing and social engineering, ransomware, spoofing, and on-path (man-in-the-middle) attacks.`,
        `Harden Windows with strong passwords, account lockout, disabling AutoRun, NTFS permissions, and current patches.`,
        `Data handling: for reuse, securely wipe a drive; for disposal, physically destroy it (shred or degauss) and keep a certificate of destruction.`
      ],
      traps:[
        `Counting two passwords as multifactor — real MFA uses two different factor categories, not two of the same.`,
        `Leaving WEP or WPA2-TKIP in place; both are deprecated. [VERIFY: whether the 220-1202 objectives expect WPA2 or WPA3 as the default best answer.]`,
        `Confusing authentication (proving who you are) with authorization (what you're allowed to do).`
      ]
    },
    3:{
      title:`Software Troubleshooting`,
      intro:`This domain covers Windows and mobile software problems, with malware removal front and center. Know the malware types and CompTIA's removal order.`,
      points:[
        `The malware-removal steps: identify and research symptoms; quarantine the system; disable System Restore in Windows; remediate (update definitions, scan, remove); schedule scans and re-enable System Restore; educate the user.`,
        `Malware types: a virus attaches to a host file, a worm self-spreads across networks, a trojan is disguised, ransomware encrypts for payment, and a rootkit hides deep in the system.`,
        `Common Windows symptoms: slow performance, pop-ups, a redirected browser, failing services, and high disk or CPU from an unknown process.`,
        `Mobile signs of compromise: fast battery drain, high data use, unexpected pop-ups, and overheating.`,
        `Boot problems: use Safe Mode and Startup Repair, and check recent driver or update changes.`
      ],
      traps:[
        `Forgetting to disable System Restore before cleaning — malware can hide in restore points and return.`,
        `Calling every self-replicating threat a virus: a worm spreads on its own across a network, while a virus needs a host file. [VERIFY: the exact malware-removal step wording in the 220-1202 objectives.]`
      ]
    },
    4:{
      title:`Operational Procedures`,
      intro:`The professional-practices domain: documentation, change management, backups, safety, privacy, and incident response. Answers usually favor following process and protecting people and data first.`,
      points:[
        `Change management uses a documented request, risk analysis, approval, a rollback/back-out plan, and a maintenance window.`,
        `The 3-2-1 backup rule: three copies, on two media types, with one off-site; test restores, not just backups.`,
        `Incident response: identify and report through the chain, preserve and document the scene and data (chain of custody), and don't alter evidence.`,
        `Electrical safety: use an ESD strap and antistatic mat for components, but never wear an ESD strap on a CRT or power supply — they hold lethal stored charge.`,
        `Handle regulated and private data (PII, PHI, PCI) per policy, and dispose of licensed software and sensitive media properly.`,
        `Follow the priority order: protect human safety first, then data, then hardware.`
      ],
      traps:[
        `Skipping the back-out/rollback plan in change management — it's a required part, not optional.`,
        `Wearing an ESD strap near a power supply or CRT — those store lethal charge; the strap is for low-voltage components only.`,
        `[VERIFY: the backup-rule wording (3-2-1) and any specific regulations the 220-1202 objectives name.]`
      ]
    }
  }
};
const API={LESSONS};
if(typeof module!=="undefined"&&module.exports)module.exports=API;
if(typeof window!=="undefined")window.Lessons=API;
})();
