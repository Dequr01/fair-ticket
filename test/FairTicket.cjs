const { expect } = require("chai");
const hre = require("hardhat");
const { time, loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("FairTicket System", function () {
  async function deployFixture() {
    const [owner, organizer, attendee, boothOperator, attacker] = await hre.ethers.getSigners();
    
    const FairTicket = await hre.ethers.getContractFactory("FairTicket");
    const fairTicket = await FairTicket.deploy();

    return { fairTicket, owner, organizer, attendee, boothOperator, attacker };
  }

  describe("Deployment", function () {
    it("Should set the right admin role", async function () {
      const { fairTicket, owner } = await loadFixture(deployFixture);
      const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
      expect(await fairTicket.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.equal(true);
    });
  });

  describe("Ticketing Flow & RBAC", function () {
    it("Should allow organizer to create event and receive ORGANIZER_ROLE", async function () {
      const { fairTicket, organizer } = await loadFixture(deployFixture);
      
      await expect(fairTicket.connect(organizer).createEvent("Rave 2025", 100))
        .to.emit(fairTicket, "EventCreated")
        .withArgs(1, organizer.address, "Rave 2025");
        
      const ORGANIZER_ROLE = await fairTicket.ORGANIZER_ROLE();
      expect(await fairTicket.hasRole(ORGANIZER_ROLE, organizer.address)).to.equal(true);
    });

    it("Should allow booth operator to assign tickets after being granted role", async function () {
      const { fairTicket, owner, boothOperator, attendee } = await loadFixture(deployFixture);
      await fairTicket.connect(owner).createEvent("Campus Fest", 50);
      
      const BOOTH_OPERATOR_ROLE = await fairTicket.BOOTH_OPERATOR_ROLE();
      await fairTicket.connect(owner).grantRole(BOOTH_OPERATOR_ROLE, boothOperator.address);

      const nameHash = hre.ethers.id("John Doe");
      const studentIdHash = hre.ethers.id("ST12345");

      await expect(fairTicket.connect(boothOperator).assignTicket(1, attendee.address, nameHash, studentIdHash))
        .to.emit(fairTicket, "TicketAssigned")
        .withArgs(1, 1, attendee.address, nameHash, studentIdHash);

      const [ticketData] = await fairTicket.getTicketDetails(1);
      expect(ticketData.holderNameHash).to.equal(nameHash);
      expect(ticketData.holderStudentIdHash).to.equal(studentIdHash);
    });

    it("Should prevent double metadata assignment", async function () {
      const { fairTicket, owner, boothOperator, attendee } = await loadFixture(deployFixture);
      await fairTicket.connect(owner).createEvent("Campus Fest", 50);
      const BOOTH_OPERATOR_ROLE = await fairTicket.BOOTH_OPERATOR_ROLE();
      await fairTicket.connect(owner).grantRole(BOOTH_OPERATOR_ROLE, boothOperator.address);

      const nameHash = hre.ethers.id("John Doe");
      const studentIdHash = hre.ethers.id("ST12345");

      await fairTicket.connect(boothOperator).assignTicket(1, attendee.address, nameHash, studentIdHash);

      await expect(fairTicket.connect(boothOperator).updateTicketMetadata(1, nameHash, studentIdHash))
        .to.be.revertedWithCustomError(fairTicket, "AlreadyAssigned");
    });

    it("Should prevent booth operator from verifying tickets", async function () {
      const { fairTicket, owner, boothOperator, attendee } = await loadFixture(deployFixture);
      await fairTicket.connect(owner).createEvent("Campus Fest", 50);
      const BOOTH_OPERATOR_ROLE = await fairTicket.BOOTH_OPERATOR_ROLE();
      await fairTicket.connect(owner).grantRole(BOOTH_OPERATOR_ROLE, boothOperator.address);
      
      await fairTicket.connect(boothOperator).assignTicket(1, attendee.address, hre.ethers.id("N"), hre.ethers.id("ID"));

      const nonce = 123456;
      const deadline = (await time.latest()) + 60;
      const network = await hre.ethers.provider.getNetwork();
      const messageHash = hre.ethers.solidityPackedKeccak256(
        ["uint256", "uint256", "uint256", "address", "uint256"],
        [1, nonce, deadline, await fairTicket.getAddress(), network.chainId]
      );
      const signature = await attendee.signMessage(hre.ethers.getBytes(messageHash));

      await expect(fairTicket.connect(boothOperator).verifyTicket(1, nonce, deadline, signature))
        .to.be.revertedWithCustomError(fairTicket, "UnauthorizedOrganizer");
    });
  });

  describe("Verification Security", function () {
    let fairTicket, organizer, attendee, attacker;
    let tokenId = 1;
    let eventId = 1;

    beforeEach(async function () {
        ({ fairTicket, organizer, attendee, attacker } = await loadFixture(deployFixture));
        await fairTicket.connect(organizer).createEvent("SecureEvent", 50);
        await fairTicket.connect(organizer).mintTicket(eventId, attendee.address);
    });

    it("Should verify valid signature", async function () {
      const nonce = 123456;
      const deadline = (await time.latest()) + 60;
      
      const network = await hre.ethers.provider.getNetwork();
      
      const messageHash = hre.ethers.solidityPackedKeccak256(
        ["uint256", "uint256", "uint256", "address", "uint256"],
        [tokenId, nonce, deadline, await fairTicket.getAddress(), network.chainId]
      );
      
      const signature = await attendee.signMessage(hre.ethers.getBytes(messageHash));

      await expect(fairTicket.connect(organizer).verifyTicket(tokenId, nonce, deadline, signature))
        .to.emit(fairTicket, "TicketScanned");
    });

    it("Should reject expired deadline", async function () {
      const nonce = 123456;
      const deadline = (await time.latest()) - 10; // Expired
      
      const network = await hre.ethers.provider.getNetwork();
      const messageHash = hre.ethers.solidityPackedKeccak256(
        ["uint256", "uint256", "uint256", "address", "uint256"],
        [tokenId, nonce, deadline, await fairTicket.getAddress(), network.chainId]
      );
      const signature = await attendee.signMessage(hre.ethers.getBytes(messageHash));

      await expect(fairTicket.connect(organizer).verifyTicket(tokenId, nonce, deadline, signature))
        .to.be.revertedWithCustomError(fairTicket, "ChallengeExpired");
    });

    it("Should NOT revert but emit Failure on invalid signature", async function () {
      const nonce = 123456;
      const deadline = (await time.latest()) + 60;
      
      const network = await hre.ethers.provider.getNetwork();
      const messageHash = hre.ethers.solidityPackedKeccak256(
        ["uint256", "uint256", "uint256", "address", "uint256"],
        [tokenId, nonce, deadline, await fairTicket.getAddress(), network.chainId]
      );
      
      const signature = await attacker.signMessage(hre.ethers.getBytes(messageHash));

      await expect(fairTicket.connect(organizer).verifyTicket(tokenId, nonce, deadline, signature))
        .to.emit(fairTicket, "VerificationFailed")
        .withArgs(tokenId, "Invalid Signature or Owner");
    });

    it("Should lockout after 3 failed attempts", async function () {
       const nonce = 123456;
       const deadline = (await time.latest()) + 600; 
       const network = await hre.ethers.provider.getNetwork();
       const messageHash = hre.ethers.solidityPackedKeccak256(
         ["uint256", "uint256", "uint256", "address", "uint256"],
         [tokenId, nonce, deadline, await fairTicket.getAddress(), network.chainId]
       );
       const signature = await attacker.signMessage(hre.ethers.getBytes(messageHash));

       // Attempt 1
       await fairTicket.connect(organizer).verifyTicket(tokenId, nonce, deadline, signature);
       // Attempt 2
       await fairTicket.connect(organizer).verifyTicket(tokenId, nonce, deadline, signature);
       
       // Attempt 3 -> Should Lock
       await expect(fairTicket.connect(organizer).verifyTicket(tokenId, nonce, deadline, signature))
         .to.emit(fairTicket, "TicketLocked");

       // Attempt 4 -> Should Revert (LockedOut)
              await expect(fairTicket.connect(organizer).verifyTicket(tokenId, nonce, deadline, signature))
                .to.be.revertedWithCustomError(fairTicket, "TicketLockedOut");
           });
         });
       
         describe("Guest (No-Wallet) Workflow", function () {
           let fairTicket, organizer, boothOperator;
           const nameHash = hre.ethers.id("Guest Student");
           const studentIdHash = hre.ethers.id("GS-999");
       
           beforeEach(async function () {
             ({ fairTicket, organizer, boothOperator } = await loadFixture(deployFixture));
             const BOOTH_OPERATOR_ROLE = await fairTicket.BOOTH_OPERATOR_ROLE();
             await fairTicket.grantRole(BOOTH_OPERATOR_ROLE, boothOperator.address);
             await fairTicket.connect(organizer).createEvent("Guest Event", 100);
           });
       
           it("Should generate a valid deterministic guest address", async function () {
             const guestAddr = await fairTicket.generateGuestAddress(nameHash, studentIdHash);
             expect(guestAddr).to.be.properAddress;
             expect(guestAddr).to.not.equal(hre.ethers.ZeroAddress);
           });
       
           it("Should allow booth operator to assign to a GuestID", async function () {
             const guestAddr = await fairTicket.generateGuestAddress(nameHash, studentIdHash);
             
             await expect(fairTicket.connect(boothOperator).assignTicket(1, guestAddr, nameHash, studentIdHash))
               .to.emit(fairTicket, "TicketAssigned")
               .withArgs(1, 1, guestAddr, nameHash, studentIdHash);
       
             expect(await fairTicket.ownerOf(1)).to.equal(guestAddr);
           });
       
           it("Should allow organizer to check-in a guest with valid hashes", async function () {
             const guestAddr = await fairTicket.generateGuestAddress(nameHash, studentIdHash);
             await fairTicket.connect(boothOperator).assignTicket(1, guestAddr, nameHash, studentIdHash);
       
             await expect(fairTicket.connect(organizer).checkInGuest(1, nameHash, studentIdHash))
               .to.emit(fairTicket, "TicketScanned")
               .withArgs(1, 1, organizer.address, 0);
       
             const [ticketData] = await fairTicket.getTicketDetails(1);
             expect(ticketData.isScanned).to.equal(true);
           });
       
           it("Should reject guest check-in with invalid hashes", async function () {
             const guestAddr = await fairTicket.generateGuestAddress(nameHash, studentIdHash);
             await fairTicket.connect(boothOperator).assignTicket(1, guestAddr, nameHash, studentIdHash);
       
             const wrongHash = hre.ethers.id("Wrong Name");
             await expect(fairTicket.connect(organizer).checkInGuest(1, wrongHash, studentIdHash))
               .to.be.revertedWithCustomError(fairTicket, "InvalidGuestIdentity");
           });
         });
       });
       